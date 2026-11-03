# <Feature name>

- **Status:** Draft | Approved | Implemented
- **Ticket:** #<issue> (optional)

## Problem / Goal
Why this exists and who it's for. 1-3 sentences.

## Behavior
Testable statements, one per line.
- When <trigger>, then <observable result>.

## Non-goals
What is explicitly out of scope.

## Interfaces
- **Socket events:** name, direction (client→server / server→client), payload shape
- **Server state:** new/changed fields on the lobby model
- **Client:** pages/components touched, new props, new strings in `constants/strings.js`

## Test seams
The highest existing seam(s) where this behavior is verified (prefer existing seams over new ones; ideally one). Say how tests drive it, so each Behavior line can become a test (see `/tdd`).

## Acceptance criteria
- [ ] Checkable condition the reviewer can verify against the diff

## Open questions
Anything unresolved. Must be empty before Status is Approved.
