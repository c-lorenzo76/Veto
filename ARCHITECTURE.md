# Veto — Architecture

**Veto** is a real-time multiplayer group restaurant decision app. A host creates a lobby, players join via a 6-character PIN, everyone votes on food preferences through a poll, and the server queries the Google Places API to return restaurant recommendations. Players then vote on a final restaurant — the winner is revealed on a dedicated winner screen.

**Contents:** [Tech Stack](#tech-stack) · [Project Structure](#project-structure) · [Environment Variables](#environment-variables) · [Running Locally](#running-the-project-locally) · [Routing](#routing) · [App Flow](#full-app-flow) · [Server Data Model](#server-lobby-data-structure) · [Socket Events](#socket-events-reference) · [Implementation Details](#key-implementation-details) · [Styling](#styling-conventions) · [Testing](#testing) · [CI/CD](#cicd) · [Roadmap](#whats-not-yet-built--possible-next-steps)

Related docs: [README.md](./README.md) (overview and setup) · [DEPLOYMENT.md](./DEPLOYMENT.md) (Azure and CI/CD) · [specs/](./specs) (feature specs).

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui + flowbite-react |
| Font | Plus Jakarta Sans (Google Fonts) |
| Theme | Neutral gray surfaces + forest-green primary, defined as CSS tokens in `client/src/index.css` (see Styling Conventions) |
| Animations | Framer Motion (`motion/react` on Results) + CSS keyframes (`FloatingSquares`) |
| i18n | String constants in `client/src/constants/strings.js` (en, es, fr, it, pt, ru) via `LanguageContext` |
| Real-time | Socket.io (client + server) |
| Map | react-leaflet v4 + OpenStreetMap tiles |
| Backend | Node.js + Express |
| Restaurant Data | Google Places API (Text Search + Place Details + Photo) |
| HTTP client | axios |
| Validation | Zod (server-side socket payload validation) |
| Testing | Vitest (server) |
| CI/CD | GitHub Actions → Azure Container Apps + Static Web Apps |

---

## Project Structure

```
Veto/
├── client/                        # React/Vite frontend
│   ├── src/
│   │   ├── App.jsx                # Router + app-wide LanguageProvider/SocketProvider; legacy URL redirects
│   │   ├── SocketContext.jsx      # Socket.io context provider (one socket for the whole app lifetime)
│   │   ├── constants/
│   │   │   ├── routes.js          # ROUTES: all client URLs (use these, never hard-code paths)
│   │   │   └── strings.js         # All user-facing text, per language
│   │   ├── context/
│   │   │   ├── LanguageContext.jsx # Selected language + useStrings()
│   │   │   └── RoomContext.jsx    # { code, setPhase } for the current room (provided by Room.jsx)
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Landing page (Create / Join buttons, language picker)
│   │   │   ├── Create.jsx         # Host creates lobby (gets geolocation)
│   │   │   ├── Join.jsx           # Player joins lobby via PIN (PIN can be prefilled via ?id=)
│   │   │   ├── Room.jsx           # /room?id=CODE: picks Lobby / Questions / Results by phase; handles hostLeft + kicked
│   │   │   ├── Lobby.jsx          # Pre-game waiting room (screen inside Room)
│   │   │   ├── Questions.jsx      # Poll voting (screen inside Room)
│   │   │   ├── Results.jsx        # Restaurant list + map + final vote + tie-breaker + winner (screen inside Room)
│   │   │   └── Layout.jsx         # Shared wrapper for Questions/Results (Navbar + content + Footer, full-height flex column)
│   │   ├── components/
│   │   │   ├── navbar.jsx         # Top nav card (wordmark + player name/avatar)
│   │   │   ├── Footer.jsx
│   │   │   ├── VetoWordmark.jsx   # Shared "Veto" logo text
│   │   │   ├── FloatingSquares.jsx(+.css) # Faint rising squares used behind the Lobby PIN card
│   │   │   ├── AvatarSelection.jsx
│   │   │   └── ui/                # shadcn/ui primitives (+ ripple grid, glowing effect)
│   │   ├── hooks/
│   │   │   ├── useLeaveGuard.js   # Back-button/tab-close guard + host transfer on confirmed leave
│   │   │   └── use-toast.js
│   │   └── index.css              # Tailwind + shadcn CSS vars + Veto palette tokens + Leaflet popup overrides
│   ├── Dockerfile                 # Not used by the deploy pipeline — local docker-compose testing only
│   └── index.html                 # Entry HTML (Google Fonts link here)
├── server/
│   ├── index.js                   # All backend logic
│   └── index.test.js              # Vitest unit tests (game logic, validation, timers)
├── specs/                         # Feature specs (see CLAUDE.md; _template.md for the format)
├── .github/workflows/
│   ├── ci.yml                     # Lint, build, tests, secret scanning, CodeQL
│   └── deploy.yml                 # Builds server image, deploys to Azure per environment
├── Dockerfile                     # Server container image — used by deploy.yml
├── docker-compose.yml             # Local container testing (optional, not used by CI/CD)
├── DEPLOYMENT.md                  # Full Azure infrastructure + CD pipeline setup
└── ARCHITECTURE.md                # This file
```

---

## Environment Variables

**Client** (`client/.env`):
```
VITE_MAPS_KEY=your_google_maps_key       # Domain-restricted, safe for client
VITE_API_BASE_URL=http://localhost:8000  # Backend URL — required in deployed environments,
                                          # defaults to localhost:8000 if unset (local dev)
```

**Server** (`server/.env`):
```
SECRET_KEY=your_google_places_key    # Server-only, never exposed to client
CLIENT_ORIGIN=http://localhost:5173  # Frontend origin, used for CORS + Socket.io
```

The client's `VITE_MAPS_KEY` is domain-restricted and safe to expose. `SECRET_KEY` is server-only — used for Places Text Search, Place Details, and Place Photos, all proxied through the Express server so it never reaches the browser.

---

## Running the Project Locally

See **[README.md](./README.md#getting-started)** for setup and run commands. The client connects to `VITE_API_BASE_URL` (or `localhost:8000` if unset) for both Socket.io and the photo proxy REST endpoint.

---

## Routing
The whole game lives at **`/room?id=CODE`** (like `youtube.com/watch?v=ID`). Other routes: `/` (Home), `/create`, `/join`. All paths come from `client/src/constants/routes.js` (`ROUTES.room(code)`, `ROUTES.joinWith(code)`, ...) — never hard-code a path.

`pages/Room.jsx` owns the screen. It renders Lobby, Questions or Results from a `phase` state (`'lobby' | 'poll' | 'results'`), which screens advance via `RoomContext`'s `setPhase` instead of navigating. Phases only move forward. Room also syncs `phase` from the server's `lobbyInfo.phase` (`lobby→lobby`, `poll→poll`, `finalVote|done→results`), so reloads and late joiners land on the right screen.

Room also owns the session-ending events for every screen: **`hostLeft`** and **`kicked`** both call `socket.disconnect()` and navigate home with a toast flag. Individual screens must not register their own handlers for these, and must use *named* handlers with `socket.off(event, handler)` — a bare `socket.off(event)` would also remove Room's listeners.

Opening `/room` with no session (`socket.auth.token` unset, e.g. pasted link or reload) redirects to `/join?id=CODE`. Old `/lobby|questions|results/:code` URLs redirect to the room. Route matching is case-insensitive.

---

## Full App Flow

### Phase 1 — Home / Create / Join

- `Home.jsx` has Create and Join buttons
- `Create.jsx` calls `navigator.geolocation.getCurrentPosition` to get coords, then emits `createLobby` with coords. Has an error handler for permission denied / unavailable / timeout.
- `Join.jsx` collects name + avatar + 6-character alphanumeric PIN (mobile keyboard set to `inputMode="text"` so letters can be entered, input auto-uppercased to match generated codes), calls `connectSocket`, then emits `joinLobby`. The PIN is prefilled from `?id=` when someone opens a room link without a session. A failed join (e.g. nonexistent lobby) shows a toast.
- Socket auth: username stored as `socket.auth.token`, avatar as `socket.auth.avatar`

### Phase 2 — Lobby (`/room?id=CODE`)

- Host sees a green Start button (only visible to host)
- Navbar card (wordmark, Start/Leave) and a Room PIN card (PIN, copy button, `FloatingSquares` backdrop)
- All players shown in a grid with avatar + name, inside a rounded panel with the ripple grid (ripples out from a card when a player joins/leaves)
- Host can **kick players** by hovering a card (always visible on touch) → red "Kick" pill appears top-right → click emits `kickUser`
- Kicked players are sent home via `Room.jsx` with `{ state: { kicked: true } }` → red toast on Home
- PIN can be copied to clipboard
- `lobbyInfo` event keeps the user list in sync
- When host clicks Start → `startGame` emitted → server snapshots `lockedPlayers`
- Leave button confirms, hands off host duties if needed, disconnects and returns home
- Back button / tab close is guarded (`useLeaveGuard`) — confirms before leaving; if the host leaves and another player remains, host duties transfer via `transferHost`/`hostTransferred` instead of ending the game

### Phase 3 — Questions (`/room?id=CODE`)

- Server drives ALL question advancement (not client)
- Server emits `phase_start` with `{ questionIndex, duration: 30, startedAt, lockedPlayers }`
- Client computes remaining time from `startedAt` and runs a local countdown
- Timer turns yellow at ≤10s, red at ≤5s
- If timer runs out with **zero votes**: server extends by **10 seconds** and emits `phase_extend`
- If timer runs out with ≥1 vote: server advances to next question
- If all locked players vote before timer: server clears timer and advances immediately
- **Observers** (late joiners): can see questions and who voted, but the Vote button is hidden. Server rejects their vote events.
- Progress bar shows `(currentQuestion / total) * 100` (never reaches 100% during the poll)
- Vote count badge per card shows `X / lockedPlayers.length`. When a player disconnects during the poll the server removes them from `lockedPlayers` and the client drops them from its local list, so the total shrinks.
- Leave button (next to the progress bar) confirms, transfers host if needed, disconnects and returns home

**Poll questions (4 total):**
1. Top priority (Ambiance / Budget / Cuisine / Distance)
2. Price range ($, $$, $$$, $$$$)
3. Cuisine type (Italian, Mexican, Chinese, Japanese, Mediterranean, American, French, Thai)
4. Travel distance (Walking 0-1mi, Short drive 1-5mi, Moderate 5-15mi, Long 15+mi)

### Phase 4 — Results / Final Vote (`/room?id=CODE`)

Layout: on `md`+ screens a **40% left restaurant list** beside a **60% right Leaflet map**; on phones the **map is on top** and the list scrolls below it. The container height is bounded to the viewport (measured in a `useLayoutEffect`) so the list scrolls internally. Live mouse cursors were removed.

**Server after poll ends:**
1. Calls `getMostVotedOptions` (tie-broken randomly) to build the search query
2. Calls Google Places Text Search: `${cuisine} restaurant` within a radius mapped from the distance answer, filtered by price level
3. Stores results in `lobby.places`
4. Emits `getPlaces` with `{ places, coords, lockedPlayers }`
5. Starts a **90-second final vote timer**, emits `phase_start` with `{ phase: 'finalVote', duration: 90, startedAt, lockedPlayers }`

**Client (Results.jsx):**
- Top bar shows countdown timer + `X/Y voted` pill (total count only, not which restaurant)
- Observers see a "👀 Watching" label, no vote button
- Expanding a restaurant row shows: photo, rating, stars, review count, price, address, open/closed, phone, website, Google Maps link
- **Vote button** appears at the bottom of the expanded row (locked players only, one vote per session)
- Voted row shows `✓ Voted`; other rows show `Already voted` (disabled)
- If timer runs out with zero votes: extends **15 seconds**
- When all locked players vote or timer ends: server picks the winner (random tie-break), emits `winner`

### Phase 5 — Winner Screen (same page, state change in Results.jsx)

- `phase` state switches from `'voting'` to `'winner'`
- Card on the shared page gradient with trophy icons; a short tie-breaker "spin the wheel" carousel plays first when restaurants tie
- Shows: restaurant name, photo, rating, price, address, hours, phone, website, Google Maps link
- Exit button disconnects the socket and returns to Home

---

## Server Lobby Data Structure

```js
lobbies[code] = {
    host: string,                    // socket.data.user of host
    users: [{ name, avatar }],       // all connected users
    coords: "lat,lng",               // from Create.jsx geolocation
    phase: 'lobby' | 'poll' | 'finalVote' | 'done',
    lockedPlayers: [{ name, avatar }], // snapshot on startGame; leavers are pruned during the poll phase
    currentQuestion: number,         // 0-indexed, server-driven
    questionStartedAt: timestamp,    // Date.now() when question started
    questionTimer: Timeout,          // setTimeout reference
    restaurantVotes: {},             // { username: placeId }
    finalVoteTimer: Timeout,         // setTimeout reference
    places: [],                      // Google Places results
    searchMeta: { radiusUsed, searchBroadened }, // set after the Places search
    poll: [ /* 4 question objects */ ],
}
```

Each poll question:
```js
{
    id: number,
    question: string,
    options: [{ id, text, votes: [username, ...] }]
}
```

---

## Socket Events Reference

| Event | Direction | Description |
|---|---|---|
| `createLobby` | C→S | Host creates lobby with `{ coords }` |
| `lobbyCreated` | S→C | Returns `code` to host |
| `joinLobby` | C→S | Player joins with `{ lobbyCode }` |
| `lobbyJoined` | S→C | Confirms join, sent only to the joining socket |
| `lobbyInfo` | S→C | Broadcasts `{ code, users, host, phase }` to the room |
| `updateLobby` | C→S | Request fresh lobbyInfo |
| `selfInfo` | S→C | Tells a specific socket whether it's the current host |
| `startGame` | C→S | Host starts the game `{ lobbyCode }` |
| `gameStarted` | S→C | Moves all clients to the Questions screen. Payload: `{ lockedPlayers }` |
| `kickUser` | C→S | Host kicks `{ lobbyCode, targetUser }` |
| `kicked` | S→C | Sent to the kicked user only (handled in `Room.jsx`) |
| `hostLeft` | S→C | Broadcast when the host disconnects (tab closed/connection lost) or leaves with no successor; the lobby is destroyed. Handled in `Room.jsx` on every screen |
| `transferHost` | C→S | Confirmed-leaving host hands off `{ lobbyCode }` |
| `hostTransferred` | S→C | Broadcasts `{ newHost }` after a successful handoff |
| `getPollData` | C→S | Request poll questions |
| `setPoll` | S→C | Full poll state `{ questions }` |
| `phase_start` | S→C | `{ phase, questionIndex?, duration, startedAt, lockedPlayers }` |
| `phase_extend` | S→C | `{ addedSeconds }` — timer extended |
| `vote` | C→S | `{ optionId, lobbyCode }` — server uses its own `currentQuestion` |
| `navResults` | S→C | Moves all clients to the Results screen |
| `getPlaces` | S→C | `{ places, coords, lockedPlayers }` |
| `getPlaceDetails` | C→S | `{ placeId }` — fetches name, rating, address, hours, phone, website, photos |
| `placeDetails` | S→C | Full Place Details object |
| `voteRestaurant` | C→S | `{ lobbyCode, placeId }` — final restaurant vote |
| `restaurantVoteCount` | S→C | `{ voted, total }` — count only, no breakdown |
| `winner` | S→C | `{ place }` — winning restaurant object |
| `cursorMove` / `cursorLeave` | C→S | **Unused.** Live cursors were removed from the client; the server handlers remain and can be deleted |
| `userDisconnect` | S→C | Username of a disconnected non-host player |
| `Error` | S→C | Error string |

---

## Key Implementation Details

### App-wide Socket.io connection
`SocketProvider` wraps the whole app once in `App.jsx` (inside `BrowserRouter`, around `<Routes>`) — **not** per-route. One socket persists for the entire browser session instead of disconnecting/reconnecting on every navigation. Because of this, anywhere a session actually *ends* (confirmed leave via `useLeaveGuard`, `kicked`, `hostLeft`, or the winner screen's Exit button) must explicitly call `socket.disconnect()` — the server's cleanup logic (removing a player from `lobby.users`, triggering host transfer) only runs on an actual `disconnect` event, which no longer happens automatically just from navigating away.

### Dev-mode duplicate requests
`main.jsx` renders `<React.StrictMode>`, which runs every `useEffect` twice on mount in development. Effects that emit (e.g. `updateLobby`, `getPollData`) therefore show up twice in the server logs in dev only; production builds run them once. Listeners are cleaned up on unmount, so nothing leaks.

### Back-button / leave guard
`useLeaveGuard` pushes a guard entry via React Router's own `navigate()` (not raw `window.history.pushState`) so React Router's internal location tracking never desyncs from the real browser history stack — a raw `pushState` call doesn't fire `popstate`, so React Router has no way to observe it, which previously caused subsequent `navigate()` calls to silently fail after a leave/re-enter cycle.

### Input validation
All client→server socket payloads are validated server-side with Zod schemas via a `withValidation` wrapper — malformed payloads are rejected with an `Error` emit instead of trusting client input directly.

### Rate limiting
Per-socket in-memory rate limiting on `createLobby` (5/min) and `vote`/`voteRestaurant` (10/2s). The `/api/place-photo` REST endpoint has an `express-rate-limit` cap of 60 req/min to protect the paid Places API calls behind it.

### Photo Proxy + Cache
All Google Place photos go through `GET /api/place-photo?ref=<photo_reference>` on the Express server. Photos are cached in a `Map<ref, { data: Buffer, contentType }>` — no repeat API calls within a server session.

```jsx
// Usage in client:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
<img src={`${API_BASE_URL}/api/place-photo?ref=${photo_reference}`} />
```

### Leaflet Setup (Vite fix)
```js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
```
Must use `react-leaflet@4` — v5 requires React 19.

### "You Are Here" Marker
Custom `L.divIcon` with a red dot + label. Coords passed from the server in the `getPlaces` payload as a `"lat,lng"` string.

### MapController Component
A separate child component inside `<MapContainer>` that uses the `useMap()` hook to call `map.flyTo()` when the selected place changes.

### Observer Mode
Late joiners are added to `users` but NOT `lockedPlayers`. The server rejects their `vote` and `voteRestaurant` events. The client checks `lockedPlayers.some(p => p.name === socket.auth.token)` to show/hide vote buttons.

### Timer Architecture
The server emits `startedAt + duration` once. The client computes `remaining = duration - (Date.now() - startedAt) / 1000` on mount and runs a local `setInterval`. `phase_extend` just adds seconds to the local `timeLeft` state.

### Host Disconnect / Transfer
On a confirmed leave, the client emits `transferHost` before disconnecting. The server picks the first remaining player in `lobby.users` as successor, updates `lobby.host`, and broadcasts `hostTransferred` + refreshed `lobbyInfo`/`selfInfo` so every client's `isHost` flag recalculates. If no successor exists (the host was the only player), the server falls back to the original behavior: broadcast `hostLeft` and delete the lobby.

### Places API error visibility
`searchPlaces()` on the server checks `response.data.status` in addition to the HTTP response — Google's Places API returns HTTP 200 even on failures like `REQUEST_DENIED` or `OVER_QUERY_LIMIT`, with the real reason only in the JSON body. Logging this prevents API misconfiguration (bad key restrictions, disabled billing, wrong API enabled) from silently manifesting as an empty restaurant list with no error anywhere.

---

## Styling Conventions

- **Palette lives in `client/src/index.css`** as CSS variables (HSL channels, with a `.dark` set), mapped to Tailwind names in `tailwind.config.js`. Use the names, not raw hex or `gray-*`:

  | Token / class | Used for |
  |---|---|
  | `primary` (`--primary: 120 40% 30%`) | Buttons, accents, progress (forest green) |
  | `brand-ink` | Headings, wordmark, strong text (dark green) |
  | `gold` | Yellow accent (wordmark "to", PIN card bar) |
  | `surface`, `surface-muted`, `surface-border`, `surface-strong` | Cards/panels, tints and hovers, borders and tracks, progress track |
  | `page-top`, `page-mid`, `page-bottom` | Page background gradient (`bg-gradient-to-b from-page-top via-page-mid to-page-bottom`) |
  | `muted-foreground` | Secondary (gray) text |

  Status colors (red/yellow timer warnings, the amber "search broadened" notice, the red "you are here" pin) intentionally stay as plain Tailwind/hex.
- **Font**: Plus Jakarta Sans loaded via Google Fonts in `client/index.html`, set on `body` in `index.css`
- **Cards**: `bg-surface border border-surface-border shadow-md rounded-3xl` (navbar, PIN card, question panel); width `w-[90%] lg:w-[80%] mx-auto`
- **Page chrome**: `Layout.jsx` provides the gradient, navbar and footer as a full-height flex column so the footer stays at the bottom on short screens. Lobby builds its own page with the same gradient.
- **Leaflet popup**: `.veto-popup` class overrides in `index.css` for a rounded, padded card style

---

## Testing

- **Server**: `cd server && npm test` — Vitest suite covering `getMostVotedOptions` tie-breaking, Places query building, input validation logic, and timer/advance-question logic
- **Client**: no automated test suite yet — verify changes manually in the browser (see `DEPLOYMENT.md` for the Dev1 environment used to test deployed changes)

---

## CI/CD

- **`ci.yml`**: runs on every push/PR to `main`, `uat`, `develop`: lint, build, server tests, secret scanning (gitleaks) and CodeQL. All must pass before merging (enforced via branch protection).
- **`deploy.yml`**: builds the server image, deploys it to the matching Azure Container App, builds the client and deploys it to the matching Static Web App. Branch → environment mapping, approvals and Azure setup are documented in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## What's NOT Yet Built / Possible Next Steps

- **Known issue:** reloading or opening a deep link (e.g. `/room?id=CODE`) returns a 404 on Azure Static Web Apps because there is no `staticwebapp.config.json` `navigationFallback` (see `DEPLOYMENT.md` → Troubleshooting)
- Persistent storage / running multiple server replicas (lobbies, timers and the photo cache are in-memory; see `specs/horizontal-scaling.md`, Draft)
- Authentication / user accounts
- "Play Again" functionality (create a new lobby with the same group after a game ends)
- Mapbox integration (currently OpenStreetMap — would allow full theme customization)
- Custom domain for Prod
