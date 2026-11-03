# Veto

Veto helps a group decide where to eat. Instead of just listing nearby restaurants, it collects everyone's preferences through a short live poll and recommends a place that fits the group.

## Background

Veto was inspired by the many times my partner and I struggled to decide where to eat, often spending more time second-guessing our options than enjoying a meal. Our indecisiveness led me to build a tool that simplifies group decision-making.

## How it works

1. A host creates a lobby and shares the 6-character PIN.
2. Players join with the PIN, then the host starts the game.
3. Everyone votes on a short poll (priority, price, cuisine, distance).
4. The server queries the Google Places API and returns a shortlist of restaurants.
5. Players vote on a final restaurant, and the winner is revealed on a dedicated screen.

## Getting started

**Prerequisites:** Node.js 20 and a Google Places API key.

1. Create `server/.env` and `client/.env` with the variables listed in [ARCHITECTURE.md](./ARCHITECTURE.md#environment-variables).
2. Start the backend (port 8000):

   ```bash
   cd server
   npm install
   npm start
   ```

3. In a second terminal, start the frontend (port 5173):

   ```bash
   cd client
   npm install
   npm run dev
   ```

4. Open <http://localhost:5173>.

To run both in containers instead, use `docker-compose up` (see [DEPLOYMENT.md](./DEPLOYMENT.md#local-container-testing)).

Run the server tests with `cd server && npm test`.

## Documentation

| Document | What's in it |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Tech stack, project structure, routing, game flow, socket events, server data model, styling conventions |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Environments and branch mapping, Azure setup, the CI/CD pipeline, troubleshooting |
| [specs/](./specs) | Feature specs (format in `specs/_template.md`); only specs marked `Approved` are implemented |
