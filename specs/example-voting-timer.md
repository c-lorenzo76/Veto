# Voting timer

- **Status:** Draft (EXAMPLE - mock spec showing the format; not a real ticket)
- **Ticket:** none

## Problem / Goal
Voting rounds can stall when one person never votes. The host should be able to set a time limit so the round ends automatically and the group keeps moving.

## Behavior
- The host can pick a voting time limit in the Create/Lobby settings: Off (default), 30s, 60s, or 120s.
- When the host starts the game with a limit set, every client sees a countdown during the voting phase.
- The countdown is driven by a server-provided end timestamp, so all clients show the same remaining time (within ~1s).
- When the timer reaches 0, the server ends the voting phase using the votes cast so far, even if not everyone has voted.
- If every participant votes before the timer ends, the phase ends immediately and the timer disappears.
- If the limit is Off, no timer is shown and behavior is unchanged from today.
- A user who joins mid-voting sees the correct remaining time.
- With zero votes cast at timeout, the existing tie-breaker path is used.

## Non-goals
- Per-user timers or pausing the timer.
- Changing the limit after the game has started.
- Timers for phases other than voting.

## Interfaces
- **Socket events:**
  - `updateLobby` (client→server): payload gains `voteTimeLimitSec: 0 | 30 | 60 | 120` (host only; validated with zod like existing schemas).
  - `phase_start` (server→client): payload gains `endsAt: number | null` (epoch ms).
- **Server state:** lobby gains `voteTimeLimitSec` and a server-side timeout handle, cleared on early completion, host transfer to a new game, and lobby deletion.
- **Client:**
  - Pages: `Create.jsx`, `Lobby.jsx` (selector), the voting/results page (countdown).
  - New strings in `client/src/constants/strings.js` for all supported languages.
  - Countdown respects reduced-motion (no animated ring; plain text).

## Acceptance criteria
- [ ] Non-host clients cannot change `voteTimeLimitSec` (server rejects it).
- [ ] Invalid values (e.g. 45, -1, "abc") are rejected by validation.
- [ ] Server timeout fires exactly once per voting phase and is cleared on early completion (no leaked timers).
- [ ] Countdown reads `endsAt`, not a locally accumulated counter.
- [ ] Late joiner sees the correct remaining time.
- [ ] Limit Off produces no UI or behavior change.
- [ ] All new user-facing text goes through `useStrings()`.
- [ ] `npm run lint` and `npm run build` pass.

## Open questions
- None.
