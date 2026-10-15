import { Button } from "@/components/ui/button";
import { Copy, Crown, LogOut } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";
import { VetoWordmark } from "@/components/VetoWordmark";
import { FloatingSquares } from "@/components/FloatingSquares";
import { useSocket } from "@/SocketContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRoom } from "@/context/RoomContext";
import { ROUTES } from "@/constants/routes";
import { motion, useReducedMotion } from "framer-motion";
import { useToast } from "@/hooks/use-toast"
import { useLeaveGuard } from "@/hooks/useLeaveGuard";
import { useStrings } from "@/context/LanguageContext";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const RIPPLE_ROWS = 8;
const RIPPLE_COLS = 27;

export const Lobby = () => {
    const { socket } = useSocket();
    const { code, setPhase } = useRoom();
    const navigate = useNavigate();
    const { toast } = useToast();
    const t = useStrings();
    const reducedMotion = useReducedMotion();

    const [users, setUsers] = useState([]);
    const [lobbyCode, setLobbyCode] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [host, setHost] = useState(null);
    const [rippleTrigger, setRippleTrigger] = useState(0);
    const [rippleOrigin, setRippleOrigin] = useState(null);
    const [isLoadingLobby, setIsLoadingLobby] = useState(true);

    useLeaveGuard({ socket, code, isHost });

    // Tracks each player card's DOM node and its last-known position in the
    // ripple grid's row/col space, so a join/leave/kick can ripple out from
    // that specific card instead of always the grid's center.
    const cardRefs = useRef(new Map());
    const cardPositionsRef = useRef(new Map());
    const rippleContainerRef = useRef(null);
    const prevUserNamesRef = useRef([]);

    const computeCardOrigin = (node) => {
        const container = rippleContainerRef.current;
        if (!container || !node) return null;
        const containerRect = container.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) return null;

        const centerX = nodeRect.left + nodeRect.width / 2 - containerRect.left;
        const centerY = nodeRect.top + nodeRect.height / 2 - containerRect.top;
        const xFrac = Math.min(1, Math.max(0, centerX / containerRect.width));
        const yFrac = Math.min(1, Math.max(0, centerY / containerRect.height));

        return {
            row: Math.min(RIPPLE_ROWS - 1, Math.floor(yFrac * RIPPLE_ROWS)),
            col: Math.min(RIPPLE_COLS - 1, Math.floor(xFrac * RIPPLE_COLS)),
        };
    };

    // Ripple the player-grid background whenever the roster actually
    // changes (join/kick), not on the initial mount/render. The ripple
    // originates from the affected player's card position.
    const isFirstUsersRender = useRef(true);
    useEffect(() => {
        const currentNames = users.map((u) => u?.name).filter(Boolean);

        if (isFirstUsersRender.current) {
            isFirstUsersRender.current = false;
            prevUserNamesRef.current = currentNames;
            currentNames.forEach((name) => {
                const pos = computeCardOrigin(cardRefs.current.get(name));
                if (pos) cardPositionsRef.current.set(name, pos);
            });
            return;
        }

        const prevNames = prevUserNamesRef.current;
        const removedNames = prevNames.filter((n) => !currentNames.includes(n));
        const addedNames = currentNames.filter((n) => !prevNames.includes(n));

        let origin = null;
        if (removedNames.length > 0) {
            origin = cardPositionsRef.current.get(removedNames[0]) || null;
            removedNames.forEach((n) => cardPositionsRef.current.delete(n));
        } else if (addedNames.length > 0) {
            origin = computeCardOrigin(cardRefs.current.get(addedNames[0]));
        }

        // Refresh positions for all currently present cards for next time.
        currentNames.forEach((name) => {
            const pos = computeCardOrigin(cardRefs.current.get(name));
            if (pos) cardPositionsRef.current.set(name, pos);
        });

        prevUserNamesRef.current = currentNames;
        setRippleOrigin(origin);
        setRippleTrigger((n) => n + 1);
    }, [users]);


    useEffect(() => {
        if (!socket) {
            console.error('Socket in not initialized...');
            return;
        }

        socket.emit('updateLobby', { lobbyCode: code });

        // Named handlers: socket.off(event) without one would also remove the
        // listeners Room.jsx registers for the same events.
        const handleLobbyInfo = (lobby) => {
            setLobbyCode(lobby.code);
            setUsers(lobby.users);
            setHost(lobby.host);
            setIsLoadingLobby(false);
        };

        const handleSelfInfo = ({ isHost: hostStatus }) => {
            setIsHost(hostStatus);
        };

        const handleGameStarted = () => {
            setPhase("poll");
        };

        const handleUserDisconnect = (discPlayer) => {
            setUsers((prevState) => prevState.filter((u) => u.name !== discPlayer));
            console.log(discPlayer, "Disconnected")
        };

        const handleHostTransferred = ({ newHost }) => {
            toast({
                title: t.lobby.newHostTitle,
                description: t.lobby.newHostDescription(newHost),
                duration: 2500,
            });
        };

        socket.on("lobbyInfo", handleLobbyInfo);
        socket.on("selfInfo", handleSelfInfo);
        socket.on("gameStarted", handleGameStarted);
        socket.on("userDisconnect", handleUserDisconnect);
        socket.on("hostTransferred", handleHostTransferred);

        return () => {
            socket.off("lobbyInfo", handleLobbyInfo);
            socket.off("selfInfo", handleSelfInfo);
            socket.off("gameStarted", handleGameStarted);
            socket.off("userDisconnect", handleUserDisconnect);
            socket.off("hostTransferred", handleHostTransferred);
        };
    }, [code, socket, t, setPhase]);

    const handleStartGame = () => {
        socket.emit('startGame', { lobbyCode: code });
    };

    const handleKick = (targetUser) => {
        socket.emit('kickUser', { lobbyCode: code, targetUser });
    };

    const handleLeaveLobby = () => {
        const message = isHost ? t.leaveGuard.hostLeaveMessage : t.leaveGuard.playerLeaveMessage;
        const confirmed = window.confirm(message);
        if (!confirmed) return;

        if (isHost && socket && code) {
            socket.emit('transferHost', { lobbyCode: code });
        }
        socket?.disconnect();
        navigate(ROUTES.home);
    };

    const handleCopyPin = () => {
        navigator.clipboard.writeText(lobbyCode)
            .then(
                () => {
                    toast({
                        title: t.lobby.pinCopiedTitle,
                        description: t.lobby.pinCopiedDescription,
                        duration: 1500,
                        variant: "default",
                    });
                    console.log('PIN copied to clipboard');
                }
            ).catch(
                (err) => {
                    toast({
                        title: t.lobby.errorTitle,
                        description: t.lobby.errorCopyDescription,
                        variant: "destructive",
                    });
                    console.error('Failed to copy: ', err);
                }
            );
    }

    return (

        <div className="flex flex-col min-h-screen bg-gradient-to-b from-page-top via-page-mid to-page-bottom">

            <div className="flex flex-wrap gap-2 mx-auto items-center w-[90%] lg:w-[80%] px-6 py-5 bg-surface border border-surface-border shadow-md mt-8 rounded-3xl">
                <VetoWordmark size="sm" onDark={false} />

                <div className="flex items-center gap-3 ml-auto">
                    <div className="start-button flex justify-center items-center">
                        {isHost && (
                            <Button
                                className="text-white px-8"
                                onClick={handleStartGame}
                            >
                                {t.lobby.start}
                            </Button>
                        )}
                        {!isHost && (
                            <span className="text-muted-foreground italic">{t.lobby.waitingForHost}</span>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        className="bg-transparent"
                        onClick={handleLeaveLobby}
                    >
                        <LogOut className="w-4 h-4 mr-1" />
                        {t.lobby.leave}
                    </Button>
                </div>
            </div>

            <motion.div
                initial={reducedMotion ? false : { opacity: 0.0, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                    delay: reducedMotion ? 0 : 0.3,
                    duration: reducedMotion ? 0 : 0.95,
                    ease: "easeInOut",
                }}
            >
                <div className="game-pin relative overflow-hidden w-[90%] lg:w-[80%] mx-auto flex items-center justify-between gap-4 px-8 py-8 bg-surface border border-surface-border shadow-md mt-6 rounded-3xl">
                    <FloatingSquares />
                    <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
                    <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-yellow-400/15 blur-3xl" />
                    <div className="relative flex items-stretch gap-4">
                        <div aria-hidden="true" className="w-1 rounded-full bg-gradient-to-b from-primary to-gold" />
                        <div className="flex flex-col">
                            <h6 className="text-primary font-bold uppercase tracking-widest text-xs">
                                {t.lobby.roomPin}
                            </h6>
                            <h1 className="text-5xl font-bold text-brand-ink tracking-[0.2em] mt-1">
                                {lobbyCode || t.lobby.loading}
                            </h1>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label={t.lobby.copyPinLabel}
                        className="relative cursor-pointer inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white border border-surface-border text-brand-ink shadow-sm hover:bg-surface-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        onClick={() => {
                            if (lobbyCode) {
                                handleCopyPin();
                            }
                        }}
                    >
                        <Copy />
                    </button>
                </div>
            </motion.div>

            <section className="flex flex-col flex-grow mx-auto w-[90%] lg:w-[80%] mt-6">
                <div className="flex items-center mb-3">
                    <h2 className="text-2xl font-bold text-brand-ink">{t.lobby.players}</h2>
                    <div className="flex items-center ml-auto">
                        <span className="text-brand-ink font-semibold">{users.length}</span>
                        <span className="ml-2 text-brand-ink/60">{t.lobby.joined}</span>
                    </div>
                </div>

                <div className="joined-users relative flex-grow min-h-[22rem] overflow-hidden rounded-3xl border border-surface-border bg-surface/60" ref={rippleContainerRef}>
                    <BackgroundRippleEffect
                        rows={RIPPLE_ROWS}
                        cols={RIPPLE_COLS}
                        rippleTrigger={rippleTrigger}
                        rippleOrigin={rippleOrigin}
                    />
                    <div className="relative z-10 p-6 sm:p-8">
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {isLoadingLobby ? (
                            Array.from({ length: 3 }).map((_, index) => (
                                <div key={index} className="flex items-center space-x-4 bg-white/80 dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-xl p-4 shadow-sm">
                                    <Skeleton className="flex-shrink-0 h-14 w-14 rounded-full" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                            ))
                        ) : users.map((user, index) => {
                            const userName = user?.name;
                            const displayName = userName || t.lobby.playerFallback;
                            const avatarSrc = user?.avatar || null;
                            const isPlayerHost = Boolean(userName && userName === host);

                            return (
                                <motion.div
                                    ref={(el) => {
                                        if (el) cardRefs.current.set(displayName, el);
                                        else cardRefs.current.delete(displayName);
                                    }}
                                    key={displayName + index}
                                    initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: reducedMotion ? 0 : 0.28, delay: reducedMotion ? 0 : index * 0.04 }}
                                    layout
                                >
                                    <div className="relative rounded-xl">
                                        <GlowingEffect
                                            disabled={false}
                                            glow={true}
                                            proximity={64}
                                            spread={40}
                                            inactiveZone={0.01}
                                            borderWidth={2}
                                        />
                                        <div className="relative flex items-center gap-4 bg-white/80 dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
                                            {isHost && userName !== socket?.auth?.token && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleKick(displayName)}
                                                    aria-label={t.lobby.kickPlayerLabel(displayName)}
                                                    className="absolute top-2 right-2 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-red-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity"
                                                >
                                                    {t.lobby.kick}
                                                </button>
                                            )}
                                            {avatarSrc ? (
                                                <img
                                                    src={avatarSrc}
                                                    alt={displayName}
                                                    className="flex-shrink-0 h-14 w-14 rounded-full object-cover bg-surface-muted"
                                                    onError={(e) => {
                                                        // If image fails, hide it and insert a neutral placeholder (no initials)
                                                        e.currentTarget.style.display = "none";
                                                        const parent = e.currentTarget.parentElement;
                                                        if (parent && !parent.querySelector(".avatar-placeholder")) {
                                                            const placeholder = document.createElement("div");
                                                            placeholder.className =
                                                                "avatar-placeholder flex-shrink-0 h-14 w-14 rounded-full bg-surface-strong dark:bg-slate-700";
                                                            placeholder.setAttribute("aria-hidden", "true");
                                                            parent.insertBefore(placeholder, e.currentTarget);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex-shrink-0 h-14 w-14 rounded-full bg-surface-strong dark:bg-slate-700" aria-hidden="true" />
                                            )}

                                            <div className="flex flex-col min-w-0">
                                                {isPlayerHost && (
                                                    <span className="inline-flex items-center gap-1 bg-brand-ink text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1">
                                                        <Crown className="w-3 h-3 text-yellow-400" />
                                                        {t.lobby.hostBadge}
                                                    </span>
                                                )}
                                                <div className="text-lg font-semibold truncate">{displayName}</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        </div>
                    </div>
                </div>
            </section>
            <Footer className="mt-10" />
        </div>
    );
};
