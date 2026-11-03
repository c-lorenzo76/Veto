# Veto

See `ARCHITECTURE.md` for architecture, socket events, and the server data model.

## Specs
Feature specs live in `specs/` (format: `specs/_template.md`). If a spec exists for the feature you're changing, read it first and treat it as the source of truth. If the code and spec disagree, or the spec is ambiguous, stop and ask; don't silently deviate. Only specs with Status `Approved` are implemented.

Specs are written by `/to-spec` as files in `specs/` (using `_template.md`, including its Test seams section) with a matching GitHub issue that links to the file. See `docs/agents/issue-tracker.md`.

## Commits and pushes
Never run `git commit`, `git push`, or merge/create a PR without my explicit approval for that specific change, **even when a skill (e.g. `/implement`) says to commit**. When the work is done, stop: show the diff and a draft commit message (ending with `Closes #<issue>` where applicable) and wait for me to verify it works.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`c-lorenzo76/Veto`) via the `gh` CLI. Every issue gets one type label (`bug`/`feature`) and at least one area label (`client`/`server`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage state labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), with `enhancement` mapped to `feature`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
