import { Button } from "@/components/ui/button";
import { User, Dot, ChevronsLeft, ChevronsRight, Copy } from 'lucide-react';
import { Footer } from "@/components/Footer";
import { useSocket } from "@/SocketContext";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast"

export const Lobby = () => {
    const { socket } = useSocket();
    const { code } = useParams(); // Extract lobby code from the URL parameters
    const navigate = useNavigate();
    const { toast } = useToast();

    const [users, setUsers] = useState([]);
    const [lobbyCode, setLobbyCode] = useState('');
    const [isHost, setIsHost] = useState(false);


    useEffect(() => {
        if (!socket) {
            console.error('Socket in not initialized...');
            return;
        }

        socket.emit('updateLobby', { lobbyCode: code });

        socket.on("lobbyInfo", (lobby) => {
            setLobbyCode(lobby.code);
            setUsers(lobby.users);
            setIsHost(lobby.host === socket.auth.token);
        });

        socket.on('gameStarted', () => {
            navigate(`/Questions/${code}`);
        });

        socket.on("userDisconnect", (discPlayer) => {
            setUsers((prevState) => prevState.filter((u) => u !== discPlayer));
            console.log(discPlayer, "Disconnected")
        });
    }, [code, socket]);

    const handleStartGame = () => {
        socket.emit('startGame', { lobbyCode: code });
    };

    const handleCopyPin = () => {
        navigator.clipboard.writeText(lobbyCode)
            .then(
                () => {
                    toast({
                        title: "PIN Copied",
                        description: "Lobby PIN has been copied to clipboard.",
                        duration: 1500,
                        variant: "default",
                    });
                    console.log('PIN copied to clipboard');
                }
            ).catch(
                (err) => {
                    toast({
                        title: "Error",
                        description: "Failed to copy PIN to clipboard. Try again.",
                        variant: "destructive",
                    });
                    console.error('Failed to copy: ', err);
                }
            );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <motion.div
                initial={{ opacity: 0.0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                    delay: 0.3,
                    duration: 0.95,
                    ease: "easeInOut",
                }}
            >
                <div className="game-pin w-max mx-auto flex flex-col items-center p-8 bg-gray-100 mt-8">
                    <h1 className="flex items-center justify-center text-2xl font-bold">
                        PIN: {lobbyCode || 'Loading...'}
                        <Copy className={"ml-2 cursor-pointer"}
                            onClick={() => {
                                if (lobbyCode) {
                                    handleCopyPin();
                                }
                            }}
                        />
                    </h1>
                </div>
            </motion.div>
            <div className="sub-nav w-full m-8 grid grid-cols-3 mx-auto items-center">
                <motion.div
                    initial={{ opacity: 0.0, x: -40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{
                        delay: 0.3,
                        duration: 0.95,
                        ease: "easeInOut",
                    }}
                >
                    <div className="players-joined flex justify-center items-center">
                        <Button>
                            <Dot size={24} className="mr-2 text-red-500" />
                            <span>{users.length}</span>
                            <User size={24} className="ml-2" />
                        </Button>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0.0, y: -40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        delay: 0.3,
                        duration: 0.95,
                        ease: "easeInOut",
                    }}
                >
                    <div className="veto-title flex justify-center items-center">
                        <h1 className="text-5xl font-bold bg-transparent text:shadow-lg">Veeto</h1>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0.0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{
                        delay: 0.3,
                        duration: 0.95,
                        ease: "easeInOut",
                    }}
                >
                    <div className="start-button flex justify-center items-center">
                        {isHost && (
                            <Button
                                className="bg-yellow-500 hover:bg-yellow-300 text-black px-8"
                                onClick={handleStartGame}
                            >
                                Start
                            </Button>
                        )}
                    </div>
                </motion.div>
            </div>
            <div className="flex border-t-2 justify-center items-center p-5 space-x-2">
                <ChevronsLeft />
                <h2 className="mt text-2xl text-center font-bold">Joined users</h2>
                <ChevronsRight />
            </div>
            {/* Joined users — responsive Kahoot-like grid */}
            {/* Joined users — avatars only (no initials fallback) */}
            <div className="joined-users flex-grow">
                <div className="m-8 mx-auto w-full max-w-5xl">
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {users.map((user, index) => {
                            const displayName =
                                typeof user === "string" ? user : user?.name || user?.username || "Player";

                            const avatarProp =
                                typeof user === "string"
                                    ? null
                                    : user?.avatar || user?.avatarUrl || user?.pfp || null;
                            let avatarSrc = null;
                            if (avatarProp) {
                                if (/^(https?:)?\/\//.test(avatarProp) || avatarProp.startsWith("/")) {
                                    avatarSrc = avatarProp;
                                } else {
                                    avatarSrc = `/assets/avatar-pfp/${avatarProp}`;
                                }
                            } else if (typeof user === "string") {
                                // try to resolve a file matching the username (adjust extension if your assets use a different one)
                                avatarSrc = `/assets/avatar-pfp/${user}.png`;
                            }

                            return (
                                <motion.div
                                    key={(typeof user === "string" ? user : displayName) + index}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.28, delay: index * 0.04 }}
                                    layout
                                >
                                    <div className="flex items-center space-x-4 bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                        {avatarSrc ? (
                                            <img
                                                src={avatarSrc}
                                                alt={displayName}
                                                className="flex-shrink-0 h-14 w-14 rounded-full object-cover bg-gray-100"
                                                onError={(e) => {
                                                    // If image fails, hide it and insert a neutral placeholder (no initials)
                                                    e.currentTarget.style.display = "none";
                                                    const parent = e.currentTarget.parentElement;
                                                    if (parent && !parent.querySelector(".avatar-placeholder")) {
                                                        const placeholder = document.createElement("div");
                                                        placeholder.className =
                                                            "avatar-placeholder flex-shrink-0 h-14 w-14 rounded-full bg-gray-300 dark:bg-slate-700";
                                                        placeholder.setAttribute("aria-hidden", "true");
                                                        parent.insertBefore(placeholder, e.currentTarget);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="flex-shrink-0 h-14 w-14 rounded-full bg-gray-300 dark:bg-slate-700" aria-hidden="true" />
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="text-lg font-semibold truncate">{displayName}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};
