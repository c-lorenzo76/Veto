import { createContext, useContext } from "react";

// Provided by pages/Room.jsx: the lobby code for the current room and a way for
// a screen to move the room to its next phase ('poll' | 'results').
export const RoomContext = createContext(null);

export const useRoom = () => useContext(RoomContext);
