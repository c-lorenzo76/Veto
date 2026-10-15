import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStrings } from "@/context/LanguageContext";
import { ROUTES } from "@/constants/routes";

/**
 * Warns before an in-progress lobby session is abandoned via browser back/forward
 * or tab close/refresh. Confirmed host departures hand off to another player via
 * the `transferHost` event instead of silently destroying the lobby on disconnect.
 *
 * Pass `isHost` if the caller already tracks it (e.g. Lobby.jsx); otherwise the
 * hook requests it itself via `updateLobby`/`selfInfo`.
 */
export function useLeaveGuard({ socket, code, isHost: isHostProp }) {
    const navigate = useNavigate();
    const location = useLocation();
    const t = useStrings();
    const isHostRef = useRef(isHostProp ?? false);
    const socketRef = useRef(socket);
    const codeRef = useRef(code);
    const guardPathRef = useRef(location.pathname + location.search);
    const stringsRef = useRef(t);
    stringsRef.current = t;

    useEffect(() => {
        if (isHostProp !== undefined) isHostRef.current = isHostProp;
    }, [isHostProp]);

    useEffect(() => {
        socketRef.current = socket;
        codeRef.current = code;
    }, [socket, code]);

    // Self-manage isHost when the caller doesn't already track it
    useEffect(() => {
        if (isHostProp !== undefined || !socket || !code) return;

        const handleSelfInfo = ({ isHost }) => {
            isHostRef.current = isHost;
        };

        socket.on('selfInfo', handleSelfInfo);
        socket.emit('updateLobby', { lobbyCode: code });

        return () => socket.off('selfInfo', handleSelfInfo);
    }, [socket, code, isHostProp]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    useEffect(() => {
        // Pushed through React Router's own navigate (not raw window.history.pushState)
        // so its internal location/index tracking stays in sync with the real browser
        // history stack — pushState never fires popstate, so React Router has no way
        // to observe a raw pushState call, which otherwise silently desyncs its state
        // and can break subsequent navigate() calls after a leave/re-enter cycle.
        navigate(guardPathRef.current, { replace: false });

        const handlePopState = () => {
            const host = isHostRef.current;
            const { hostLeaveMessage, playerLeaveMessage } = stringsRef.current.leaveGuard;
            const confirmed = window.confirm(host ? hostLeaveMessage : playerLeaveMessage);

            if (!confirmed) {
                navigate(guardPathRef.current, { replace: false });
                return;
            }

            const sock = socketRef.current;
            const lobbyCode = codeRef.current;
            if (host && sock && lobbyCode) {
                sock.emit('transferHost', { lobbyCode });
            }
            // The socket is now shared app-wide (not recreated per route), so leaving
            // has to disconnect explicitly — otherwise the server never sees a
            // disconnect event and won't remove this player from lobby.users.
            sock?.disconnect();

            navigate(ROUTES.home, { replace: true });
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [navigate]);
}
