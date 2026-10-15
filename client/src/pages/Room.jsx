import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useSocket } from "@/SocketContext";
import { RoomContext } from "@/context/RoomContext";
import { ROOM_PARAM, ROUTES } from "@/constants/routes";
import { Lobby } from "./Lobby";
import { Questions } from "./Questions";
import { Results } from "./Results";

// Screens only move forward during a game.
const SCREEN_ORDER = ["lobby", "poll", "results"];

// Server lobby.phase -> screen
const SERVER_PHASE_TO_SCREEN = {
    lobby: "lobby",
    poll: "poll",
    finalVote: "results",
    done: "results",
};

export const Room = () => {
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const code = searchParams.get(ROOM_PARAM)?.toUpperCase() || "";
    const [phase, setPhaseState] = useState("lobby");

    const setPhase = useCallback((next) => {
        setPhaseState((current) =>
            SCREEN_ORDER.indexOf(next) > SCREEN_ORDER.indexOf(current) ? next : current
        );
    }, []);

    // Keep the screen in sync with the server's phase, so late joiners and
    // reloads land on the right screen instead of always the lobby.
    useEffect(() => {
        if (!socket) return;
        const handleLobbyInfo = ({ phase: serverPhase }) => {
            const screen = SERVER_PHASE_TO_SCREEN[serverPhase];
            if (screen) setPhase(screen);
        };
        socket.on("lobbyInfo", handleLobbyInfo);
        return () => socket.off("lobbyInfo", handleLobbyInfo);
    }, [socket, setPhase]);

    // Session-ending events are handled here, once, so they work on every screen
    // (lobby, questions, results): the host leaving destroys the lobby, and a
    // kicked player is removed. Both end the session and return home.
    useEffect(() => {
        if (!socket) return;
        const handleHostLeft = () => {
            socket.disconnect();
            navigate(ROUTES.home, { state: { hostLeft: true }, replace: true });
        };
        const handleKicked = () => {
            socket.disconnect();
            navigate(ROUTES.home, { state: { kicked: true }, replace: true });
        };
        socket.on("hostLeft", handleHostLeft);
        socket.on("kicked", handleKicked);
        return () => {
            socket.off("hostLeft", handleHostLeft);
            socket.off("kicked", handleKicked);
        };
    }, [socket, navigate]);

    const value = useMemo(() => ({ code, setPhase }), [code, setPhase]);

    // No code, or no session (opened the link directly / reloaded): there is no
    // socket identity to act as, so send them to join with the PIN prefilled.
    if (!code || !socket?.auth?.token) {
        return <Navigate to={code ? ROUTES.joinWith(code) : ROUTES.join} replace />;
    }

    return (
        <RoomContext.Provider value={value}>
            {phase === "lobby" && <Lobby />}
            {phase === "poll" && <Questions />}
            {phase === "results" && <Results />}
        </RoomContext.Provider>
    );
};
