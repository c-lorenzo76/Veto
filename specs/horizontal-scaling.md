# Horizontal Scaling

- **Status:** Draft
- **Ticket:** (none yet)

## Problem / Goal
The server keeps all game state in one Node process's memory (`let lobbies = {}` in `server/index.js`), so it cannot run more than one replica, and a restart or deploy destroys every active game. The goal is to let Veto run on multiple server replicas, survive restarts, and bound resource use, without changing the gameplay.

## Behavior
Staged. Each stage ships independently and must not change game rules.

**Stage 0: measure**
- When the load-test script runs N lobbies of 6 players against one instance, then memory, CPU and event-loop lag are recorded for a baseline.

**Stage 1: harden the single instance**
- When `photoCache` reaches its size cap, then the least recently used entry is evicted.
- When a place photo is served, then the response includes a `Cache-Control` header.
- When the mouse moves, then the client sends `cursorMove` at most ~20 times per second.
- When a lobby has had no activity for the idle timeout, then it is deleted and its timers cleared.
- When identical Places searches (same rounded location and filters) occur within the cache window, then Google is called once.
- When `GET /metrics` is requested, then it returns lobby count, socket count and memory use.

**Stage 2: stateless server**
- When a lobby is created, then it is stored in Redis under `lobby:<code>` with a TTL, not in process memory.
- When a player on replica B emits any lobby event for a lobby created on replica A, then it behaves as if both were on the same server.
- When `io.to(code).emit(...)` is called, then every player in that lobby receives it regardless of replica.
- When a question or final-vote deadline passes, then exactly one replica advances the phase.
- When a replica restarts, then lobbies and their phase deadlines survive and clients stay connected after reconnecting.
- When a host kicks a player or transfers the host role, then it works even if the target's socket is on another replica.
- When a socket event exceeds its rate limit, then the limit counts across all replicas.

**Stage 3: polish**
- When a player's connection drops, then they can rejoin the same lobby within a grace period instead of being removed immediately.
- When error rate, event-loop lag or Google quota use crosses a threshold, then an alert fires.

## Non-goals
- Changing gameplay, UI or the poll content.
- Multi-region deployment.
- User accounts or long-term game history (can be a separate spec).
- Replacing Socket.IO.

## Interfaces
- **Socket events:** no change to event names or payloads in Stages 0-2. Stage 3 adds a `rejoinLobby` event (client→server, `{ lobbyCode, playerId }`) and a stable `playerId` issued on join.
- **Server state:** lobby model moves to Redis as JSON. New fields: `phaseEndsAt` (ms timestamp), `lastActivityAt`. Timer handles (`questionTimer`, `finalVoteTimer`) are no longer stored on the lobby; deadlines are scheduled by a single owner per lobby (delayed job queue or lock). New storage module with `getLobby`, `saveLobby`, `deleteLobby`, used in place of direct `lobbies[...]` access (about 20 sites in `server/index.js`). Socket.IO uses `@socket.io/redis-adapter`; the kick and host-transfer loops over `io.sockets.sockets` change to `io.in(code).fetchSockets()`.
- **Client:** `client/src/SocketContext.jsx` sets `transports: ['websocket']` (or the load balancer uses sticky sessions). `Lobby.jsx` or `useLeaveGuard` handle `rejoinLobby` in Stage 3. No new user-facing strings unless a reconnecting message is added.
- **Infra:** Azure Cache for Redis; Container Apps scale rule on concurrent connections; updates to `DEPLOYMENT.md` and `.github/workflows/deploy.yml`; new `REDIS_URL` environment variable.

## Acceptance criteria
- [ ] Load-test script exists and baseline numbers are recorded.
- [ ] `photoCache` is bounded and photos carry `Cache-Control`.
- [ ] `cursorMove` is throttled on the client.
- [ ] Idle lobbies are removed and their timers cleared.
- [ ] No direct `lobbies[...]` access remains outside the storage module.
- [ ] Two local server instances behind a proxy with Redis: create on A, join on B, vote, kick, transfer host and let timers expire, all correctly.
- [ ] Killing one instance mid-game does not lose the lobby.
- [ ] Existing `server/index.test.js` passes, plus new tests for the storage module and timer ownership.
- [ ] `DEPLOYMENT.md` documents Redis and the scale rule.

## Open questions
- Redis hosting choice (Azure Cache for Redis vs. self-managed) and budget?
- Target scale (concurrent lobbies and players) to decide whether Stage 2 is needed now?
- Timer approach: BullMQ delayed jobs vs. a per-lobby lock with in-process timers?
- Is a rejoin grace period (Stage 3) wanted, and how long?
