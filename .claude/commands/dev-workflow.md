---
description: Run the full human-in-the-loop dev workflow for a Veto ticket (branch -> locate -> implement -> review -> UI/UX review -> human approval)
---

> **Note:** the preferred flow is now the Matt Pocock skills: `/grill-with-docs` → `/to-spec` → `/implement` (see `CLAUDE.md` and `docs/agents/`). This command is kept for reference.

You are the orchestrator for this development workflow. You manage subagents
but never write application code or commit/push yourself. The human is always
the final approver before any commit.

Ticket: $ARGUMENTS

## Step 0 — Spec (only if a spec is provided)
If the arguments reference a spec file (e.g. `specs/foo.md`), or a matching
spec exists in `specs/`, read it. Confirm its Status is `Approved` and its
Open questions are empty; if not, STOP and ask the human. Pass the spec path
to every subagent below. The spec is the source of truth: implementation and
review are judged against its Behavior and Acceptance criteria. If no spec
exists, skip this step and proceed ticket-only.

## Step 1 — Branch
1. Checkout `develop` and pull latest.
2. Create a branch named after the ticket, `feature/<relevant-name-to-issue>` depending on ticket type. Confirm the
   branch name with the human before creating it if the ticket type is unclear.

## Step 2 — Locate
Delegate to the `issue-locator` subagent with the ticket description (and spec path, if any).
Wait for its report.

## Step 3 — Implement
Delegate to the `implementer` subagent with:
- The original ticket (and spec path, if any)
- The locator's report
Wait for its summary of changes.

## Step 4 — Review
Delegate to the `reviewer` subagent with:
- The original ticket (and spec path, if any)
- The locator's report
- The implementer's diff/summary

If a spec exists, the reviewer must check the diff against each Acceptance
criterion and report any unmet or out-of-scope (Non-goals) change.

If reviewer returns CHANGES REQUESTED: send feedback back to `implementer`
and repeat Step 4. Cap this loop at 3 rounds — if still not approved after 3,
stop and escalate to the human with a summary of the disagreement.

## Step 4.5 — UI/UX review (only if client UI changed)
If the diff touches files under `client/src` that render UI (components,
pages, screens — not pure logic/hooks/socket code), delegate to the
`ui-ux-reviewer` subagent with:
- The ticket
- The implementer's diff/summary

It reviews for modern visual design and cross-device responsiveness and
returns findings only (it does not implement fixes). If it raises findings,
send them back to `implementer` as an additional round within the same
3-round cap as Step 4. Skip this step entirely for server-only or non-visual
changes.

## Step 5 — Human approval (STOP HERE)
Once reviewer returns APPROVED, present to the human:
- Ticket summary
- Spec acceptance criteria checklist (met / unmet), if a spec was used
- Root cause (from locator)
- What changed and why (from implementer)
- Reviewer's verification notes
- UI/UX reviewer's notes (if Step 4.5 ran)
- The full diff (`git diff`)
- A draft commit message (summary of changes + `Closes #<issue>`

Then STOP. Do not commit. Do not push. Wait for the human to explicitly
approve, request changes, or reject. This is a hard boundary — never commit
or push on your own initiative, regardless of how confident the review was.
