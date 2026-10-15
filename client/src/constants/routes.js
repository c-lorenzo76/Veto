// Single source of truth for client URLs. Paths are lowercase; the whole game
// lives at one URL (/room?id=CODE) and the Room page picks the screen
// (lobby / questions / results) from the game phase, like youtube.com/watch?v=ID.
export const ROOM_PARAM = "id";

export const ROUTES = {
    home: "/",
    create: "/create",
    join: "/join",
    // Join with the PIN prefilled (used when someone opens a room link without a session).
    joinWith: (code) => `/join?${ROOM_PARAM}=${encodeURIComponent(code)}`,
    room: (code) => `/room?${ROOM_PARAM}=${encodeURIComponent(code)}`,
};
