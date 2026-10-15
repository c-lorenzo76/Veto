import { useState, useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Layout } from "./Layout.jsx"
import { useNavigate } from "react-router-dom";
import { useRoom } from "@/context/RoomContext";
import { ROUTES } from "@/constants/routes";
import { LogOut } from "lucide-react";
import { Card } from "flowbite-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/SocketContext";
import { Progress } from "@/components/ui/progress";
import { Field, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/hooks/use-toast";
import { useLeaveGuard } from "@/hooks/useLeaveGuard";
import { useStrings } from "@/context/LanguageContext";

function CircularTimer({ timeLeft, duration }) {
    const size = 88;
    const strokeWidth = 7;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = duration > 0 ? timeLeft / duration : 0;
    const strokeDashoffset = circumference * (1 - progress);

    const color = timeLeft <= 5
        ? '#ef4444'
        : timeLeft <= 10
            ? '#eab308'
            : 'hsl(var(--brand-ink))';

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
                {/* Track */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" style={{ stroke: 'hsl(var(--surface-border))' }} strokeWidth={strokeWidth}
                />
                {/* Countdown ring */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ stroke: color, transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold tabular-nums" style={{ color }}>
                    {timeLeft}
                </span>
            </div>
        </div>
    );
}


export const Questions = () => {

    const { socket } = useSocket();
    const { code, setPhase } = useRoom();
    const navigate = useNavigate();
    const { toast } = useToast();
    const t = useStrings();
    const reducedMotion = useReducedMotion();

    useLeaveGuard({ socket, code });

    const [users, setUsers] = useState([]);
    const [poll, setPoll] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [lockedPlayers, setLockedPlayers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(30);
    const [duration, setDuration] = useState(30);

    const [isHost, setIsHost] = useState(false);

    const timerIntervalRef = useRef(null);

    const isLocked = lockedPlayers.some(p => p.name === socket?.auth?.token);

    // Request poll data on mount. The lobby roster (lobbyInfo) is requested by
    // useLeaveGuard, which emits updateLobby itself when no isHost is passed.
    useEffect(() => {
        if (!socket) return;
        socket.emit('getPollData', { lobbyCode: code });
    }, [socket, code]);

    // Attach listeners
    useEffect(() => {
        if (!socket) return;

        const handleSetPoll = (data) => setPoll(data);

        const handleLobbyInfo = (lobby) => setUsers(lobby.users);

        const handleSelfInfo = ({ isHost: hostStatus }) => setIsHost(hostStatus);

        const handleNavResults = () => setPhase("results");

        const handleUserDisconnect = (discPlayer) => {
            setUsers(prev => prev.filter(u => u.name !== discPlayer));
            setLockedPlayers(prev => prev.filter(p => p.name !== discPlayer));
        };

        const handleHostTransferred = ({ newHost }) => {
            toast({
                title: t.questions.newHostTitle,
                description: t.questions.newHostDescription(newHost),
                duration: 2500,
            });
        };

        const handlePhaseStart = ({ questionIndex, duration: dur, startedAt, lockedPlayers: lp }) => {
            setCurrentQuestion(questionIndex);
            if (lp) setLockedPlayers(lp);
            setDuration(dur);

            // Clear any running timer
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

            // Compute remaining time based on server's startedAt, clamped in both
            // directions to guard against clock skew between client and server.
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const initial = dur - Math.max(0, Math.min(dur, elapsed));
            setTimeLeft(initial);

            timerIntervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerIntervalRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        };

        const handlePhaseExtend = ({ addedSeconds }) => {
            setTimeLeft(prev => prev + addedSeconds);
        };

        const handleError = (error) => console.error(error);

        socket.on('setPoll', handleSetPoll);
        socket.on('lobbyInfo', handleLobbyInfo);
        socket.on('selfInfo', handleSelfInfo);
        socket.on('navResults', handleNavResults);
        socket.on('userDisconnect', handleUserDisconnect);
        socket.on('phase_start', handlePhaseStart);
        socket.on('phase_extend', handlePhaseExtend);
        socket.on('hostTransferred', handleHostTransferred);
        socket.on('Error', handleError);

        return () => {
            socket.off('setPoll', handleSetPoll);
            socket.off('lobbyInfo', handleLobbyInfo);
            socket.off('selfInfo', handleSelfInfo);
            socket.off('navResults', handleNavResults);
            socket.off('userDisconnect', handleUserDisconnect);
            socket.off('phase_start', handlePhaseStart);
            socket.off('phase_extend', handlePhaseExtend);
            socket.off('hostTransferred', handleHostTransferred);
            socket.off('Error', handleError);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [socket, code, setPhase, toast, t]);

    // Total votes on current question
    const totalVotes = useMemo(() => {
        return poll?.questions[currentQuestion].options.reduce(
            (acc, option) => acc + option.votes.length, 0
        ) ?? 0;
    }, [poll, currentQuestion]);

    const handleLeave = () => {
        const message = isHost ? t.leaveGuard.hostLeaveMessage : t.leaveGuard.playerLeaveMessage;
        if (!window.confirm(message)) return;

        if (isHost && socket && code) {
            socket.emit('transferHost', { lobbyCode: code });
        }
        socket?.disconnect();
        navigate(ROUTES.home);
    };

    const handleVote = (optionId) => {
        socket.emit("vote", { optionId, lobbyCode: code });
    };

    return (
        <Layout user={socket?.auth?.token} avatar={socket?.auth?.avatar}>
            <div className={"w-[90%] lg:w-[80%] rounded-2xl mx-auto py-4 pt-6 mb-6 flex items-end gap-4"}>
                <Field className="w-full flex-1">
                    <FieldLabel htmlFor="progress-poll" className="text-primary font-semibold">
                        <span className="ml-auto text-primary">
                            {currentQuestion} of {poll?.questions.length || 0}
                        </span>
                    </FieldLabel>
                    <Progress
                        value={((currentQuestion) / (poll?.questions.length || 1)) * 100}
                        id="progress-poll"
                        className="bg-surface-strong [&>div]:bg-primary"
                    />
                </Field>
                <Button variant="outline" className="bg-transparent shrink-0" onClick={handleLeave}>
                    <LogOut className="w-4 h-4 mr-1" />
                    {t.lobby.leave}
                </Button>
            </div>

            <motion.div
                className={"w-[90%] lg:w-[80%] bg-surface border border-surface-border rounded-3xl mx-auto p-6 sm:p-8 shadow-md"}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.99, ease: "easeOut" }}
            >
                {poll && (
                    <>
                        {/* Timer + question */}

                        
                        <div className="flex items-center gap-6 mb-6">
                            <CircularTimer timeLeft={timeLeft} duration={duration} />
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-primary uppercase mb-1">
                                    {t.questions.questionOf(currentQuestion + 1, poll?.questions.length || 0)}
                                </p>
                                <h1 className={"text-2xl font-bold text-brand-ink"}>
                                    {t.poll[poll.questions[currentQuestion].id].question}
                                </h1>
                            </div>
                        </div>

                        {!isLocked && (
                            <p className="text-center text-sm text-muted-foreground mt-2">
                                {t.questions.watchingBanner}
                            </p>
                        )}

                        <div className={"mt-6 grid sm:grid-cols-1 md:grid-cols-3 gap-4"}>
                            {poll.questions[currentQuestion].options.map(option => (
                                <Card
                                    key={option.id}
                                    className={"relative transition-all duration-300 min-h-[130px] bg-white border border-surface-border shadow-sm hover:shadow-md rounded-2xl p-2"}
                                >
                                    <div className={"z-10"}>
                                        <div className={"mb-2"}>
                                            <h2 className={"text-xl font-semibold text-brand-ink"}>{t.poll[poll.questions[currentQuestion].id].options[option.id]}</h2>
                                        </div>

                                        {/* Vote button — only for locked-in players */}
                                        {isLocked && (
                                            <div className={"absolute bottom-5 right-5"}>
                                                {!option.votes.includes(socket?.auth?.token) ? (
                                                    <Button
                                                        className={"text-white md:p-2"}
                                                        onClick={() => handleVote(option.id)}
                                                    >
                                                        {t.questions.vote}
                                                    </Button>
                                                ) : (
                                                    <Button disabled className={"bg-surface-border text-muted-foreground md:p-2"}>
                                                        {t.questions.voted}
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {option.votes.length > 0 && (
                                            <div className={"mt-2 flex gap-2 flex-wrap max-w-[75%]"}>
                                                {option.votes.map((vote) => (
                                                    <div
                                                        key={vote}
                                                        className={"py-1 px-3 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-sm"}
                                                    >
                                                        <div className={"w-2 h-2 bg-primary rounded-full m-1"}></div>
                                                        <div className={"text-brand-ink"}>{vote}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Vote count badge */}
                                    <div className={"absolute top-3 right-5 px-2.5 py-1 text-sm font-semibold bg-surface-muted border border-surface-border text-brand-ink rounded-full z-10"}>
                                        {option.votes.length} / {lockedPlayers.length || users.length}
                                    </div>

                                    {/* Vote bar */}
                                    <div className={"absolute bottom-0 inset-x-0 bg-surface-border rounded-b-2xl overflow-hidden h-4"}>
                                        <div
                                            className="bg-gradient-to-r from-primary/70 to-primary transition-all duration-300 h-full"
                                            style={{
                                                width: `${totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </motion.div>
        </Layout>
    );
};
