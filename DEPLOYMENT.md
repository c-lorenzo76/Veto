# Veto Deployment Guide

How Veto is built, deployed and operated: Azure Container Apps (server), Azure Static Web Apps (client) and GitHub Actions (CI/CD) across four environments. For the app itself, see [ARCHITECTURE.md](./ARCHITECTURE.md); for local setup, see [README.md](./README.md#getting-started).

**Contents:** [Overview](#overview) · [What's in the repo](#whats-in-the-repo) · [Azure setup](#azure-setup-one-time) · [Testing the pipeline](#10-test-the-pipeline) · [Troubleshooting](#troubleshooting) · [Environment URLs](#environment-urls) · [Next steps](#next-steps) · [References](#references)

---

## Overview

| Branch | Environment | Resource group | Deploy |
|---|---|---|---|
| `feature/*` | Dev1 | `veto-dev1` | Automatic on push |
| `develop` | Dev | `veto-dev` | Manual approval |
| `uat` | UAT | `veto-uat` | Manual approval |
| `main` | Prod | `veto-prod` | Manual approval (admins only) |

```
Feature branch (feature/*)  ──auto──▶  Dev1
        │ merge
Develop branch              ──approve─▶ Dev
        │ promote
UAT branch                  ──approve─▶ UAT
        │ promote
Main branch                 ──approve─▶ Prod
```

Each environment has its own resource group, Container App, Static Web App and Key Vault. Only the container registry (`vetoacr`) is shared.

---

## What's in the repo

**Containerization**
- `Dockerfile`: multi-stage build for the Express server (Node 20 Alpine). This is the image `deploy.yml` builds and pushes.
- `client/Dockerfile` and `client/nginx.conf`: Vite build served by Nginx, with `/api/*` and `/socket.io*` proxied to the server. Used for **local `docker-compose` testing only**; in Azure the client is served by Static Web Apps.

**Configuration**
- Environment variables are documented in [ARCHITECTURE.md](./ARCHITECTURE.md#environment-variables). There are no `.env.example` files, so create `server/.env` and `client/.env` yourself.
- In Azure, server secrets (`SECRET_KEY`, `CLIENT_ORIGIN`) come from each environment's Key Vault. `VITE_API_BASE_URL` is injected at client build time by `deploy.yml`.
- Health check: `GET /health` (used by Azure for liveness probes).

**GitHub Actions**
- `.github/workflows/ci.yml`: lint, build, server tests, secret scanning (gitleaks) and CodeQL on every push and PR to `main`, `uat` and `develop`.
- `.github/workflows/deploy.yml`: triggers on push to `main`, `uat`, `develop` and `feature/**` (or manually via `workflow_dispatch`). It determines the environment from the branch, authenticates to Azure via OIDC (no stored credentials), builds and pushes the server image to the registry, deploys the server to the Container App, builds the client with the environment's API base URL and deploys it to the Static Web App.

### Local container testing

```bash
docker-compose up
```

Server: <http://localhost:8000>, client: <http://localhost:5173>.

---

## Azure setup (one-time)

Run these once to create the infrastructure the pipeline deploys into.

### Prerequisites
- Azure subscription
- Azure CLI (`az` command)
- GitHub organization with admin access
- GitHub Actions enabled

### 1. Create Resource Groups (one per environment)

```bash
# Dev1
az group create --name veto-dev1 --location eastus

# Dev
az group create --name veto-dev --location eastus

# UAT
az group create --name veto-uat --location eastus

# Prod
az group create --name veto-prod --location eastus
```

### 2. Create Azure Container Registry (shared)

`deploy.yml` is configured to use a single shared registry across all 4 environments, with images tagged per-environment (`veto-server:dev1-<sha>`, `veto-server:prod-<sha>`, etc.). This is the industry-standard pattern — the registry itself doesn't need per-environment isolation, only the deploy target (Container App) and secrets (Key Vault) do.

```bash
az acr create --resource-group veto-prod --name vetoacr --sku Basic
```

Grant each Container App's managed identity `AcrPull` access to the shared registry (done in step 7, after Container Apps exist).

### 3. Create Container App Environment (per resource group)

Each environment needs a Container App Environment (compute + networking layer):

```bash
for env in dev1 dev uat prod; do
  az containerapp env create \
    --name veto-env-$env \
    --resource-group veto-$env \
    --location eastus
done
```

### 4. Create Container Apps (server backend)

```bash
for env in dev1 dev uat prod; do
  az containerapp create \
    --name veto-server-$env \
    --resource-group veto-$env \
    --environment veto-env-$env \
    --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
    --target-port 8000 \
    --ingress 'external' \
    --env-vars SECRET_KEY=placeholder CLIENT_ORIGIN=http://localhost:5173 NODE_ENV=$env
done
```

### 5. Create Static Web Apps (client frontend)

Do **not** pass `--source` here. Linking a GitHub repo via `--source` makes Azure auto-generate its own GitHub Actions workflow to build/deploy on every push — which would race against the `deploy.yml` workflow already in this repo (and ignore its branch-based approval gates entirely). Instead, create the Static Web App as a bare resource and let `deploy.yml`'s `Azure/static-web-apps-deploy@v1` step handle all deployments via an API token.

Static Web Apps are only available in a subset of regions (`eastus2`, `centralus`, `westus2`, `westeurope`, `eastasia`) — not plain `eastus`.

```bash
for env in dev1 dev uat prod; do
  az staticwebapp create \
    --name veto-client-$env \
    --resource-group veto-$env \
    --location eastus2 \
    --sku Free
done
```

Get each Static Web App's deployment token and store it as the `AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub environment secret (Settings → Environments → dev1/dev/uat/prod):

```bash
for env in dev1 dev uat prod; do
  echo "=== $env ==="
  az staticwebapp secrets list --name veto-client-$env --query "properties.apiKey" -o tsv
done
```

### 6. Create Key Vaults (secrets per environment)

```bash
for env in dev1 dev uat prod; do
  az keyvault create \
    --name veto-${env}-kv \
    --resource-group veto-$env \
    --location eastus
done
```

First, look up each Static Web App's actual hostname (Azure appends a random suffix, so it won't match a predictable pattern):

```bash
for env in dev1 dev uat prod; do
  echo "=== $env ==="
  az staticwebapp show --name veto-client-$env --query "defaultHostname" -o tsv
done
```

**Important — new Key Vaults default to Azure RBAC permission mode.** Creating the vault does not automatically grant you (or anyone) access to read/write secrets in it, even as the creator. Grant yourself access first:

```bash
for env in dev1 dev uat prod; do
  az role assignment create \
    --role "Key Vault Secrets Officer" \
    --assignee $(az ad signed-in-user show --query id -o tsv) \
    --scope $(az keyvault show --name veto-${env}-kv --query id -o tsv)
done
```

Role assignments can take 1-2 minutes to propagate — if secret commands below fail with `Forbidden`/`ForbiddenByRbac` immediately after this, just wait and retry.

Store secrets in each vault using the real hostname returned above (do this one environment at a time, not as a loop, so you can verify each before moving on):
```bash
# Example for Dev1 — replace with the actual hostname from the command above
VAULT=veto-dev1-kv

az keyvault secret set --vault-name $VAULT --name SECRET-KEY --value "your_google_places_api_key"
az keyvault secret set --vault-name $VAULT --name CLIENT-ORIGIN --value "https://<actual-dev1-hostname>.azurestaticapps.net"

# Repeat for dev, uat, prod with their respective real hostnames
```

If your Google Places API key has ever been pasted anywhere outside your own terminal (chat, screenshot, shared doc), treat it as compromised and regenerate it in Google Cloud Console before storing it here.

### 7. Enable Managed Identity & Key Vault Access

The Container Apps created in step 4 don't have a managed identity yet (it isn't on by default). Enable one, then grant it read access to its vault. Since the vaults use RBAC mode (see step 6), this uses a role assignment, not `az keyvault set-policy` (which only works with the legacy Access Policy model):

```bash
for env in dev1 dev uat prod; do
  RG=veto-$env
  VAULT=veto-${env}-kv
  CONTAINER_APP=veto-server-$env

  # Enable managed identity on the Container App
  az containerapp identity assign --name $CONTAINER_APP --resource-group $RG --system-assigned

  # Get the identity's principal ID
  IDENTITY=$(az containerapp show -n $CONTAINER_APP -g $RG --query identity.principalId -o tsv)

  # Grant it read-only access to secrets via RBAC
  az role assignment create \
    --role "Key Vault Secrets User" \
    --assignee $IDENTITY \
    --scope $(az keyvault show --name $VAULT --query id -o tsv)
done
```

**Also grant each Container App's managed identity pull access to the shared ACR.** Step 4 created these Container Apps with a public placeholder image, so they have no configured way to authenticate to the private registry yet — without this, `az containerapp update --image vetoacr.azurecr.io/...` in `deploy.yml` fails once it tries to actually deploy your real image:

```bash
for env in dev1 dev uat prod; do
  RG=veto-$env
  CONTAINER_APP=veto-server-$env
  IDENTITY=$(az containerapp show -n $CONTAINER_APP -g $RG --query identity.principalId -o tsv)
  az role assignment create --role "AcrPull" --assignee $IDENTITY --scope $(az acr show --name vetoacr --query id -o tsv)
  az containerapp registry set --name $CONTAINER_APP --resource-group $RG --server vetoacr.azurecr.io --identity system
done
```

### 8. Set Up GitHub OIDC Federation

Replace `c-lorenzo76/Veto` below with your actual `<owner>/<repo>` if different.

**If you rename the repo after setting up federated credentials, redo this section.** Azure's federated credential `subject` is an exact string match against GitHub's OIDC token, which encodes the repo's *current* name — a rename breaks every existing credential silently (the `azure/login@v1` step starts failing with no useful error). Delete and recreate each federated credential with the new repo name (see 8.3 below) rather than trying to edit it in place.

**Note on shell comments:** if pasting multi-line blocks into an interactive `zsh` session, strip any `#` comment lines first — interactive zsh doesn't treat `#` as a comment by default, so a standalone comment line fails with `command not found: #`. It's usually harmless (the real commands on other lines still run), but the blocks below are written comment-free to avoid the issue entirely, and each step includes its own verification command so a partial failure is easy to catch.

#### 8.1 Create an app registration per environment

```bash
for env in dev1 dev uat prod; do
  az ad app create --display-name "veto-$env-github"
done
```

#### 8.2 Create the service principal for each app registration

`az ad app create` only creates the app registration, not the service principal Azure actually authenticates against:

```bash
for env in dev1 dev uat prod; do
  APP_ID=$(az ad app list --display-name "veto-$env-github" --query "[0].appId" -o tsv)
  az ad sp create --id $APP_ID
done
```

#### 8.3 Add a federated identity credential per app

Each credential is scoped to the GitHub **Environment** rather than a specific branch. `deploy.yml`'s jobs already run under `environment: name: dev1/dev/uat/prod`, and Azure federated credential subjects require an exact string match (no wildcards) — an environment-scoped subject means any branch that resolves to that environment can authenticate, which matches this repo's branch→environment mapping without needing one credential per branch name:

```bash
for env in dev1 dev uat prod; do
  APP_ID=$(az ad app list --display-name "veto-$env-github" --query "[0].appId" -o tsv)
  az ad app federated-credential create --id $APP_ID --parameters "{\"name\":\"github-$env\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:c-lorenzo76/Veto:environment:$env\",\"audiences\":[\"api://AzureADTokenExchange\"]}"
done
```

Verify:
```bash
for env in dev1 dev uat prod; do
  echo "=== $env ==="
  APP_ID=$(az ad app list --display-name "veto-$env-github" --query "[0].appId" -o tsv)
  az ad app federated-credential list --id $APP_ID --query "[].{name:name, subject:subject}" -o table
done
```

#### 8.4 Grant each service principal the permissions `deploy.yml` actually exercises

These are: read its Key Vault, push to the shared ACR, and update its Container App:

```bash
for env in dev1 dev uat prod; do
  APP_ID=$(az ad app list --display-name "veto-$env-github" --query "[0].appId" -o tsv)
  SP_ID=$(az ad sp show --id $APP_ID --query id -o tsv)
  az role assignment create --role "Key Vault Secrets User" --assignee $SP_ID --scope $(az keyvault show --name veto-${env}-kv --query id -o tsv)
  az role assignment create --role "AcrPush" --assignee $SP_ID --scope $(az acr show --name vetoacr --query id -o tsv)
  az role assignment create --role "Container Apps Contributor" --assignee $SP_ID --scope $(az group show --name veto-$env --query id -o tsv)
done
```

Verify:
```bash
for env in dev1 dev uat prod; do
  echo "=== $env ==="
  SP_ID=$(az ad sp show --id $(az ad app list --display-name "veto-$env-github" --query "[0].appId" -o tsv) --query id -o tsv)
  az role assignment list --assignee $SP_ID --query "[].roleDefinitionName" -o tsv
done
```
Each environment should list all 3 roles.

#### 8.5 Get the values and store them as GitHub Environment Secrets

```bash
for env in dev1 dev uat prod; do
  echo "=== $env ==="
  echo "AZURE_CLIENT_ID: $(az ad app list --display-name "veto-$env-github" --query "[0].appId" -o tsv)"
done

echo "AZURE_TENANT_ID (same for all envs): $(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID (same for all envs): $(az account show --query id -o tsv)"
```

Go to GitHub → **Settings → Environments** → for each of `dev1`, `dev`, `uat`, `prod`, add:
- `AZURE_CLIENT_ID` — the environment-specific appId from above (different per environment)
- `AZURE_TENANT_ID` — same value for all 4
- `AZURE_SUBSCRIPTION_ID` — same value for all 4
- `AZURE_STATIC_WEB_APPS_API_TOKEN` — the per-environment token retrieved in step 5 (Static Web Apps)

### 9. Configure Environment Protection Rules

Done via GitHub Environments, not branch protection rules — "Required reviewers" is configured per-environment (Settings → Environments → [env] → Required reviewers).

**Note:** required reviewers doesn't need GitHub Teams — you can add individual usernames directly, including yourself. If you're a solo developer, listing yourself as the required reviewer isn't real access control (GitHub doesn't prevent self-approval on environment protection rules the way it can for PR reviews), but it still adds a deliberate manual confirmation step before a deploy to dev/uat/prod proceeds, which is worth having. Add real teammates as reviewers once you have collaborators — no org/Teams feature required until you want a single named group standing in for multiple people.

1. Settings → Environments → `dev` → Required reviewers → add yourself (and later, teammates)
2. Repeat for `uat`
3. Repeat for `prod` — restrict to admins/trusted reviewers only once you have more than one collaborator
4. Leave `dev1` without a protection rule — it should stay auto-deploy

### 10. Test the Pipeline

1. Push a feature branch:
   ```bash
   git checkout -b feature/test-deploy
   git push origin feature/test-deploy
   ```
   → Should trigger `.github/workflows/deploy.yml`
   → Should deploy to Dev1 automatically

2. Check GitHub Actions: Actions tab → Deploy workflow → watch for completion
3. Verify the Dev1 deployment at the URL from [Environment URLs](#environment-urls)

4. Promote to Dev:
   ```bash
   git checkout develop
   git merge feature/test-deploy
   git push origin develop
   ```
   → Should trigger approval gate
   → Manually approve in GitHub Actions
   → Should deploy to Dev

5. Repeat for UAT and Prod

---

## Troubleshooting

### Container App shows "Inactive"
- Check Container App revision logs: `az containerapp logs show`
- Verify the health check: `curl https://<backend-fqdn>/health` (look up the FQDN under [Environment URLs](#environment-urls))

### Static Web App shows 404
- Check if build/deploy succeeded: SWA → Deployments tab
- **Direct links and reloads (e.g. `/room?id=CODE`):** Static Web Apps only serves `index.html` for unknown paths if the app has a `staticwebapp.config.json` with a `navigationFallback`. The repo does not have one yet (the Nginx config only applies to local `docker-compose`), so opening or reloading a deep link returns a 404 in Azure (confirmed when reloading). Add `client/public/staticwebapp.config.json` with `{ "navigationFallback": { "rewrite": "/index.html" } }` to fix it.

### OIDC authentication fails
- Verify GitHub environment secrets are set correctly
- Check OIDC token subject matches the federated credential

### Socket.io connection fails in production
- In Azure the browser connects straight to the Container App (via the `VITE_API_BASE_URL` baked into the client build), so confirm that URL is correct for the environment
- Check CORS: `CLIENT_ORIGIN` must match frontend Static Web App URL

---

## Environment URLs

Azure assigns a random suffix to both Static Web App and Container App hostnames — there's no predictable URL pattern. Look them up directly:

```bash
for env in dev1 dev uat prod; do
  echo "=== $env ==="
  echo "Frontend: $(az staticwebapp show --name veto-client-$env --query defaultHostname -o tsv)"
  echo "Backend:  $(az containerapp show --name veto-server-$env --resource-group veto-$env --query properties.configuration.ingress.fqdn -o tsv)"
done
```

For Prod, you'll likely want to map a custom domain (e.g. `veto.app` / `api.veto.app`) once the auto-generated hostnames are confirmed working.

---

## Next steps

0. **TODO (known issue):** add `client/public/staticwebapp.config.json` with a `navigationFallback` so reloading or opening a deep link such as `/room?id=CODE` stops returning a 404 (see [Troubleshooting](#static-web-app-shows-404)).
1. **Set up:** run the Azure setup steps above (sections 1-9).
2. **Verify:** test the pipeline with a feature branch (section 10).
3. **Monitor:** set up Application Insights in Azure for logging and alerting.
4. **Custom domain:** once Prod works, configure DNS and an SSL certificate.

---

## References

- [Azure Container Apps docs](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Azure Static Web Apps docs](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub OIDC Federation](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
