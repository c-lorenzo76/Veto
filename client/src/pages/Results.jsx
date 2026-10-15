import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRoom } from "@/context/RoomContext";
import { ROUTES } from "@/constants/routes";
import { useSocket } from "@/SocketContext";
import { Layout } from "./Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Phone, Globe, ExternalLink, ChevronDown, ChevronUp, Timer, Trophy, LogOut } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useToast } from "@/hooks/use-toast";
import { useLeaveGuard } from "@/hooks/useLeaveGuard";
import { useStrings } from "@/context/LanguageContext";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Mirrors the server's distanceToRadius ladder in server/index.js so the
// broadened-search banner can show a human-readable label for the radius
// actually used.
function radiusToLabel(radiusMeters, t) {
    const radiusToLabelMap = {
        1610: t.results.radiusWalking,
        8047: t.results.radiusShortDrive,
        24145: t.results.radiusModerateDrive,
        50000: t.results.radiusLongDrive,
    };
    if (!radiusMeters) return null;
    if (radiusToLabelMap[radiusMeters]) return radiusToLabelMap[radiusMeters];
    const miles = (radiusMeters / 1609.34).toFixed(1);
    return `~${miles} miles`;
}

function MapController({ selectedPlaceId, places }) {
    const map = useMap();
    useEffect(() => {
        if (selectedPlaceId) {
            const place = places.find(p => p.place_id === selectedPlaceId);
            if (place?.geometry?.location) {
                map.flyTo([place.geometry.location.lat, place.geometry.location.lng], 15, { duration: 0.8 });
            }
        } else if (places.length > 0 && places[0].geometry?.location) {
            map.flyTo([places[0].geometry.location.lat, places[0].geometry.location.lng], 12, { duration: 0.8 });
        }
    }, [selectedPlaceId]);

    // The map's container is now bounded by Results' own layout instead of
    // growing with content, so make sure Leaflet re-measures it on mount and
    // whenever the window resizes (it doesn't auto-detect container resizes).
    useEffect(() => {
        map.invalidateSize();
        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [map]);

    return null;
}

// Carousel geometry: card width + gap must match the Tailwind classes used
// on each card below (w-40 = 160px, gap-4 = 16px) so the computed slide
// offset actually centers the winning card under the pointer.
const TIEBREAK_CARD_WIDTH = 160;
const TIEBREAK_CARD_GAP = 16;
const TIEBREAK_REPEAT_COUNT = 12;

function TiebreakSpinner({ tiebreakInfo, onComplete, t }) {
    const { tied, winner } = tiebreakInfo;
    const [offset, setOffset] = useState(0);
    const [settled, setSettled] = useState(false);

    const winnerIndexInSet = Math.max(0, tied.findIndex(p => p.place_id === winner?.place_id));
    const paddingSets = Math.floor(TIEBREAK_REPEAT_COUNT / 2);
    const landingIndex = paddingSets * tied.length + winnerIndexInSet;
    const track = Array.from({ length: TIEBREAK_REPEAT_COUNT }, () => tied).flat();

    useEffect(() => {
        // +half a card width so the landing card's center — not its left
        // edge — ends up under the pointer, since the track's 50% left
        // padding places card index 0's left edge at viewport center.
        const targetOffset = landingIndex * (TIEBREAK_CARD_WIDTH + TIEBREAK_CARD_GAP) + TIEBREAK_CARD_WIDTH / 2;
        // Kick off the slide on the next frame so the track first paints at
        // its resting position before animating — otherwise Framer Motion
        // has nothing to transition from.
        const raf = requestAnimationFrame(() => setOffset(targetOffset));
        const settleTimeout = setTimeout(() => setSettled(true), 2600);
        const completeTimeout = setTimeout(onComplete, 3300);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(settleTimeout);
            clearTimeout(completeTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex-1 px-6 py-6 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold text-brand-ink mb-2">{t.results.tieBreakTitle}</h1>
            <p className="text-muted-foreground mb-8">{t.results.tieBreakSubtitle}</p>

            <div className="relative w-full max-w-2xl">
                <ChevronDown className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-5 h-5 text-primary" />
                <ChevronUp className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 w-5 h-5 text-primary" />
                <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-primary/40 z-10 rounded-full" />

                <div
                    className="relative overflow-hidden py-4 h-32 flex items-center"
                    style={{
                        maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                    }}
                >
                    <motion.div
                        className="flex items-center"
                        style={{ gap: TIEBREAK_CARD_GAP, paddingLeft: '50%' }}
                        animate={{ x: -offset }}
                        transition={{ duration: 2.5, ease: [0.15, 0, 0.15, 1] }}
                    >
                        {track.map((place, index) => {
                            const isWinnerCard = settled && index === landingIndex;
                            return (
                                <div
                                    key={`${place.place_id}-${index}`}
                                    className={`flex-shrink-0 bg-white rounded-2xl border overflow-hidden flex flex-col items-center justify-center transition-all duration-500 ${
                                        isWinnerCard ? 'border-primary scale-110 shadow-lg' : 'border-surface-border shadow-sm'
                                    }`}
                                    style={{ width: TIEBREAK_CARD_WIDTH, height: 112 }}
                                >
                                    {place.photos?.[0]?.photo_reference ? (
                                        <img
                                            src={`${API_BASE_URL}/api/place-photo?ref=${place.photos[0].photo_reference}`}
                                            alt={place.name}
                                            className="w-full h-14 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-14 bg-surface-border" />
                                    )}
                                    <span className="text-xs font-semibold text-brand-ink line-clamp-1 px-2 pt-1 w-full text-center">
                                        {place.name}
                                    </span>
                                </div>
                            );
                        })}
                    </motion.div>
                </div>
            </div>

            <div
                className={`mt-8 text-center transition-all duration-500 ${
                    settled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
            >
                <p className="text-muted-foreground font-medium mb-1">{t.results.tieBreakWinnerLabel}</p>
                <h2 className="text-2xl font-bold text-brand-ink uppercase tracking-wide">{winner?.name}</h2>
            </div>
        </div>
    );
}


export const Results = () => {
    const { socket } = useSocket();
    const { code } = useRoom();
    const navigate = useNavigate();
    const { toast } = useToast();
    const t = useStrings();
    const reducedMotion = useReducedMotion();

    const [isHost, setIsHost] = useState(false);

    useLeaveGuard({ socket, code, isHost });

    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlaceId, setSelectedPlaceId] = useState(null);
    const [placeDetailsMap, setPlaceDetailsMap] = useState({});
    const [loadingDetailId, setLoadingDetailId] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Phase / voting state
    const [lockedPlayers, setLockedPlayers] = useState([]);
    const [myVote, setMyVote] = useState(null);
    const [voteCount, setVoteCount] = useState({ voted: 0, total: 0 });
    const [timeLeft, setTimeLeft] = useState(90);
    const [phase, setPhase] = useState('voting'); // 'voting' | 'tiebreak' | 'winner'
    const [winnerPlace, setWinnerPlace] = useState(null);
    const [winnerDetails, setWinnerDetails] = useState(null);
    const [searchBroadened, setSearchBroadened] = useState(false);
    const [radiusUsed, setRadiusUsed] = useState(null);
    const [tiebreakInfo, setTiebreakInfo] = useState(null); // { tied: [...places], winner: place }

    const resultsContainerRef = useRef(null);
    const [containerHeight, setContainerHeight] = useState('calc(100dvh - 200px)');

    const loadingDetailRef = useRef(null);
    const timerIntervalRef = useRef(null);

    const isLocked = lockedPlayers.some(p => p.name === socket?.auth?.token);

    const youAreHereIcon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>
            <span style="font-size:10px;font-weight:700;color:#ef4444;white-space:nowrap;margin-top:3px;text-shadow:0 1px 2px white">${t.results.youAreHere}</span>
        </div>`,
        iconSize: [80, 36],
        iconAnchor: [40, 8],
    });

    useEffect(() => {
        if (!socket) return;

        socket.emit('updateLobby', { lobbyCode: code });

        const handleSelfInfo = ({ isHost: hostStatus }) => {
            setIsHost(hostStatus);
        };

        const handleGetPlaces = ({ places, coords, lockedPlayers: lp, radiusUsed: radius, searchBroadened: broadened }) => {
            setPlaces(places);
            setLoading(false);
            setRadiusUsed(radius ?? null);
            setSearchBroadened(Boolean(broadened));
            if (lp) setLockedPlayers(lp);
            if (coords) {
                const [lat, lng] = coords.split(',').map(Number);
                setUserLocation([lat, lng]);
            }
            if (places.length > 0) {
                const first = places[0];
                setSelectedPlaceId(first.place_id);
                loadingDetailRef.current = first.place_id;
                setLoadingDetailId(first.place_id);
                socket.emit('getPlaceDetails', { placeId: first.place_id });
            }
        };

        const handlePhaseStart = ({ phase: ph, duration, startedAt, lockedPlayers: lp }) => {
            if (ph !== 'finalVote') return;
            if (lp) setLockedPlayers(lp);

            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

            // Clamp elapsed in both directions to guard against clock skew
            // between client and server.
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const initial = duration - Math.max(0, Math.min(duration, elapsed));
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

        const handleVoteCount = ({ voted, total }) => {
            setVoteCount({ voted, total });
        };

        const resolveWinner = (place) => {
            setWinnerPlace(place);
            setPhase('winner');
            // Fetch full details for winner
            if (place?.place_id) {
                socket.emit('getPlaceDetails', { placeId: place.place_id });
                loadingDetailRef.current = place.place_id;
            }
        };

        const handleWinner = ({ place, tiedPlaces }) => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (tiedPlaces?.length > 1) {
                setTiebreakInfo({ tied: tiedPlaces, winner: place });
                setPhase('tiebreak');
                return;
            }
            resolveWinner(place);
        };

        // Override placeDetails to also capture winner details
        const handlePlaceDetailsWithWinner = (details) => {
            const id = loadingDetailRef.current;
            if (id) {
                setPlaceDetailsMap(prev => ({ ...prev, [id]: details }));
                setWinnerDetails(details);
                setLoadingDetailId(null);
                loadingDetailRef.current = null;
            }
        };

        socket.on('selfInfo', handleSelfInfo);
        socket.on('getPlaces', handleGetPlaces);
        socket.on('placeDetails', handlePlaceDetailsWithWinner);
        socket.on('phase_start', handlePhaseStart);
        socket.on('phase_extend', handlePhaseExtend);
        socket.on('restaurantVoteCount', handleVoteCount);

        const handleHostTransferred = ({ newHost }) => {
            toast({
                title: t.results.newHostTitle,
                description: t.results.newHostDescription(newHost),
                duration: 2500,
            });
        };

        socket.on('winner', handleWinner);
        socket.on('hostTransferred', handleHostTransferred);

        return () => {
            socket.off('selfInfo', handleSelfInfo);
            socket.off('getPlaces', handleGetPlaces);
            socket.off('placeDetails', handlePlaceDetailsWithWinner);
            socket.off('phase_start', handlePhaseStart);
            socket.off('phase_extend', handlePhaseExtend);
            socket.off('restaurantVoteCount', handleVoteCount);
            socket.off('winner', handleWinner);
            socket.off('hostTransferred', handleHostTransferred);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [code, socket, toast, t]);

    // Bound the list/map layout's height to the viewport so the list column
    // can scroll internally instead of the whole page growing with content.
    // Layout.jsx stays unbounded (it's shared with other pages), so we measure
    // this container's own position and reserve space for the Footer below it.
    useLayoutEffect(() => {
        const computeHeight = () => {
            if (!resultsContainerRef.current) return;
            const top = resultsContainerRef.current.getBoundingClientRect().top;
            const BOTTOM_RESERVE = 90; // Footer + Layout's bottom padding/gaps below this container
            const available = window.innerHeight - top - BOTTOM_RESERVE;
            setContainerHeight(`${Math.max(400, available)}px`);
        };
        computeHeight();
        window.addEventListener('resize', computeHeight);
        return () => window.removeEventListener('resize', computeHeight);
    }, [phase]);

    const handleTiebreakComplete = () => {
        const winner = tiebreakInfo?.winner;
        if (!winner) return;
        setWinnerPlace(winner);
        setPhase('winner');
        if (winner.place_id) {
            socket.emit('getPlaceDetails', { placeId: winner.place_id });
            loadingDetailRef.current = winner.place_id;
        }
    };

    const handleSelectPlace = (place) => {
        if (selectedPlaceId === place.place_id) {
            setSelectedPlaceId(null);
            return;
        }
        setSelectedPlaceId(place.place_id);
        if (!placeDetailsMap[place.place_id]) {
            loadingDetailRef.current = place.place_id;
            setLoadingDetailId(place.place_id);
            socket.emit('getPlaceDetails', { placeId: place.place_id });
        }
    };

    const handleVoteRestaurant = (placeId) => {
        if (myVote || !isLocked) return;
        setMyVote(placeId);
        socket.emit('voteRestaurant', { lobbyCode: code, placeId });
    };

    const handleExit = () => {
        socket?.disconnect();
        navigate(ROUTES.home);
    };

    const handleExitVoting = () => {
        const message = isHost ? t.results.exitVotingHostMessage : t.results.exitVotingPlayerMessage;
        const confirmed = window.confirm(message);
        if (!confirmed) return;

        if (isHost && socket && code) {
            socket.emit('transferHost', { lobbyCode: code });
        }
        handleExit();
    };

    const mapCenter = places.length > 0 && places[0].geometry?.location
        ? [places[0].geometry.location.lat, places[0].geometry.location.lng]
        : [35.85, -79.56];

    const timerColor = timeLeft <= 10 ? 'text-red-500' : timeLeft <= 20 ? 'text-yellow-500' : 'text-brand-ink';

    if (phase === 'tiebreak' && tiebreakInfo) {
        return (
            <Layout user={socket?.auth?.token} avatar={socket?.auth?.avatar}>
                <TiebreakSpinner tiebreakInfo={tiebreakInfo} onComplete={handleTiebreakComplete} t={t} />
            </Layout>
        );
    }

    if (phase === 'winner' && winnerPlace) {
        const details = winnerDetails || placeDetailsMap[winnerPlace.place_id];
        return (
            <Layout user={socket?.auth?.token} avatar={socket?.auth?.avatar}>
                <div className="flex-1 px-6 py-6 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-3 mb-6">
                        <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                        <h1 className="text-3xl font-bold text-brand-ink">{t.results.goingTo}</h1>
                        <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                    </div>

                    <div className="bg-surface border border-surface-border rounded-3xl shadow-md overflow-hidden w-full max-w-lg">
                        {details?.photos?.[0]?.photo_reference && (
                            <img
                                src={`${API_BASE_URL}/api/place-photo?ref=${details.photos[0].photo_reference}`}
                                alt={winnerPlace.name}
                                className="w-full h-52 object-cover"
                            />
                        )}
                        <div className="p-6 space-y-3">
                            <h2 className="text-2xl font-bold text-brand-ink">{winnerPlace.name}</h2>

                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-lg">{winnerPlace.rating}</span>
                                <span className="text-yellow-500 text-lg">
                                    {'★'.repeat(Math.round(winnerPlace.rating))}
                                    {'☆'.repeat(5 - Math.round(winnerPlace.rating))}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    ({winnerPlace.user_ratings_total?.toLocaleString()})
                                </span>
                                {winnerPlace.price_level && (
                                    <span className="ml-auto text-muted-foreground font-medium">
                                        {'$'.repeat(winnerPlace.price_level)}
                                    </span>
                                )}
                            </div>

                            {details?.formatted_address && (
                                <div className="flex gap-2 items-start">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm">{details.formatted_address}</span>
                                </div>
                            )}
                            {details?.opening_hours && (
                                <div className="flex gap-2 items-center">
                                    <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
                                    <span className={`text-sm font-semibold ${details.opening_hours.open_now ? 'text-green-600' : 'text-red-500'}`}>
                                        {details.opening_hours.open_now ? t.results.openNow : t.results.closed}
                                    </span>
                                </div>
                            )}
                            {details?.formatted_phone_number && (
                                <div className="flex gap-2 items-center">
                                    <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                                    <span className="text-sm">{details.formatted_phone_number}</span>
                                </div>
                            )}
                            {details?.website && (
                                <div className="flex gap-2 items-center">
                                    <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />
                                    <a href={details.website} target="_blank" rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline truncate">
                                        {details.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                    </a>
                                </div>
                            )}
                            {details?.url && (
                                <a href={details.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-primary hover:underline pt-1">
                                    <ExternalLink className="w-4 h-4" />
                                    {t.results.viewOnGoogleMaps}
                                </a>
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={handleExit}
                        variant="outline" className="mt-6 mb-6 bg-transparent"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t.results.exit}
                    </Button>
                </div>
            </Layout>
        );
    }

    // ── Voting screen ─────────────────────────────────────────
    return (
        <Layout user={socket?.auth?.token} avatar={socket?.auth?.avatar}>
            <div
                ref={resultsContainerRef}
                className="px-6 pt-4 flex flex-col"
                style={{ height: containerHeight }}
            >

                {/* Timer + vote count bar */}
                <div className="flex flex-wrap gap-2 w-[90%] lg:w-[80%] mx-auto items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                        <Timer className={`w-5 h-5 ${timerColor}`} />
                        <span className={`text-xl font-bold tabular-nums ${timerColor}`}>{timeLeft}s</span>
                    </div>
                    <div className="text-sm font-semibold text-brand-ink bg-surface border border-surface-border px-4 py-1.5 rounded-full shadow-sm">
                        {voteCount.voted} / {voteCount.total || lockedPlayers.length} {t.results.votedSuffix}
                    </div>
                    <div className="flex items-center gap-3">
                        {!isLocked && (
                            <span className="text-sm text-muted-foreground italic">{t.results.watching}</span>
                        )}
                        <Button
                            onClick={handleExitVoting}
                            variant="outline" className="bg-transparent"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {t.results.exit}
                        </Button>
                    </div>
                </div>

                {searchBroadened && (
                    <div role="status" className="w-[90%] lg:w-[80%] mx-auto mb-3 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                            {t.results.broadenedSearchText}
                            <span className="hidden sm:inline">
                                {radiusUsed ? t.results.broadenedSearchRadius(radiusToLabel(radiusUsed, t)) : ''}
                            </span>
                            .
                        </span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row w-[90%] lg:w-[80%] mx-auto gap-4 pb-6 flex-1 min-h-0">

                    {/* Restaurant list: below the map on phones, left column on larger screens */}
                    <div className="order-2 md:order-1 flex flex-col flex-1 md:flex-none min-h-0 w-full md:w-[40%] rounded-2xl overflow-hidden border border-surface-border shadow-md">
                    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3">
                                        <Skeleton className="h-4 flex-1" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-3 space-y-3">
                                {places.map((place, index) => {
                                    const isExpanded = selectedPlaceId === place.place_id;
                                    const details = placeDetailsMap[place.place_id];
                                    const isLoadingDetails = loadingDetailId === place.place_id;
                                    const hasVotedThis = myVote === place.place_id;

                                    return (
                                        <motion.div
                                            key={place.place_id}
                                            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut", delay: reducedMotion ? 0 : index * 0.04 }}
                                            className={`rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${hasVotedThis ? 'border-primary bg-primary/10' : 'border-surface-border bg-white'}`}
                                        >
                                            <div
                                                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-muted transition-colors"
                                                onClick={() => handleSelectPlace(place)}
                                            >
                                                <span className="font-medium flex-1 truncate">{place.name}</span>
                                                {hasVotedThis && (
                                                    <span className="text-xs text-primary font-semibold shrink-0">{t.results.votedCheck}</span>
                                                )}
                                                {isExpanded
                                                    ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                    : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                }
                                            </div>

                                            {isExpanded && (
                                                <motion.div
                                                    initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
                                                    className="px-5 pb-5 bg-white space-y-3 border-t border-surface-border pt-3"
                                                >
                                                    {isLoadingDetails ? (
                                                        <div className="space-y-2 pt-2">
                                                            <Skeleton className="w-full h-36 rounded-lg" />
                                                            <Skeleton className="h-4 w-32" />
                                                            <Skeleton className="h-4 w-full" />
                                                            <Skeleton className="h-4 w-40" />
                                                        </div>
                                                    ) : details && (
                                                        <>
                                                            {details.photos?.[0]?.photo_reference && (
                                                                <img
                                                                    src={`${API_BASE_URL}/api/place-photo?ref=${details.photos[0].photo_reference}`}
                                                                    alt={place.name}
                                                                    className="w-full h-36 object-cover rounded-lg"
                                                                />
                                                            )}
                                                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                                <span className="font-semibold">{details.rating}</span>
                                                                <span className="text-yellow-500">
                                                                    {'★'.repeat(Math.round(details.rating))}
                                                                    {'☆'.repeat(5 - Math.round(details.rating))}
                                                                </span>
                                                                <span className="text-muted-foreground text-sm">
                                                                    ({details.user_ratings_total?.toLocaleString()})
                                                                </span>
                                                                {details.price_level && (
                                                                    <span className="ml-auto text-muted-foreground font-medium text-sm">
                                                                        {'$'.repeat(details.price_level)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {details.formatted_address && (
                                                                <div className="flex gap-2 items-start">
                                                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                                                    <span className="text-sm">{details.formatted_address}</span>
                                                                </div>
                                                            )}
                                                            {details.opening_hours && (
                                                                <div className="flex gap-2 items-center">
                                                                    <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                                    <span className={`text-sm font-semibold ${details.opening_hours.open_now ? 'text-green-600' : 'text-red-500'}`}>
                                                                        {details.opening_hours.open_now ? t.results.openNow : t.results.closed}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {details.formatted_phone_number && (
                                                                <div className="flex gap-2 items-center">
                                                                    <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                                    <span className="text-sm">{details.formatted_phone_number}</span>
                                                                </div>
                                                            )}
                                                            {details.website && (
                                                                <div className="flex gap-2 items-center">
                                                                    <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                                    <a href={details.website} target="_blank" rel="noopener noreferrer"
                                                                        className="text-sm text-primary hover:underline truncate">
                                                                        {details.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                                                    </a>
                                                                </div>
                                                            )}
                                                            {details.url && (
                                                                <a href={details.url} target="_blank" rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-sm text-primary hover:underline pt-1">
                                                                    <ExternalLink className="w-4 h-4" />
                                                                    {t.results.viewOnGoogleMaps}
                                                                </a>
                                                            )}

                                                            {/* Vote button — locked players only, one vote */}
                                                            {isLocked && (
                                                                <motion.button
                                                                    whileHover={!myVote ? { scale: 1.03 } : {}}
                                                                    whileTap={!myVote ? { scale: 0.97 } : {}}
                                                                    onClick={() => handleVoteRestaurant(place.place_id)}
                                                                    disabled={!!myVote}
                                                                    className={`mt-2 w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                                                                        hasVotedThis
                                                                            ? 'bg-primary text-white cursor-default'
                                                                            : myVote
                                                                                ? 'bg-surface-border text-muted-foreground cursor-not-allowed'
                                                                                : 'bg-primary hover:bg-primary/90 text-white cursor-pointer'
                                                                    }`}
                                                                >
                                                                    {hasVotedThis ? t.results.yourVote : myVote ? t.results.alreadyVoted : t.results.voteForThis}
                                                                </motion.button>
                                                            )}
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    </div>

                    {/* Leaflet map: on top on phones, right column on larger screens */}
                    <div className="order-1 md:order-2 h-[38%] shrink-0 md:h-auto md:shrink md:flex-1 rounded-2xl overflow-hidden border border-surface-border shadow-md">
                        {loading ? (
                            <Skeleton className="w-full h-full" />
                        ) : places.length > 0 && (
                            <MapContainer center={mapCenter} zoom={12} className="w-full h-full">
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                <MapController selectedPlaceId={selectedPlaceId} places={places} />
                                {userLocation && (
                                    <Marker position={userLocation} icon={youAreHereIcon} />
                                )}
                                {places.map((place) => (
                                    place.geometry?.location && (
                                        <Marker
                                            key={place.place_id}
                                            position={[place.geometry.location.lat, place.geometry.location.lng]}
                                            eventHandlers={{ click: () => handleSelectPlace(place) }}
                                        >
                                            <Popup className="veto-popup" maxWidth={280} minWidth={240}>
                                                {placeDetailsMap[place.place_id]?.photos?.[0]?.photo_reference && (
                                                    <img
                                                        src={`${API_BASE_URL}/api/place-photo?ref=${placeDetailsMap[place.place_id].photos[0].photo_reference}`}
                                                        alt={place.name}
                                                        className="w-full h-32 object-cover"
                                                    />
                                                )}
                                                <div className="p-4 space-y-2">
                                                    <p className="font-bold text-base leading-tight">{place.name}</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-semibold text-sm">{place.rating}</span>
                                                        <span className="text-yellow-500 text-sm">
                                                            {'★'.repeat(Math.round(place.rating))}{'☆'.repeat(5 - Math.round(place.rating))}
                                                        </span>
                                                        <span className="text-muted-foreground text-xs">({place.user_ratings_total?.toLocaleString()})</span>
                                                        {place.price_level && (
                                                            <span className="text-muted-foreground text-xs ml-1">· {'$'.repeat(place.price_level)}</span>
                                                        )}
                                                    </div>
                                                    {place.formatted_address && (
                                                        <div className="flex gap-2 items-start">
                                                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                                                            <span className="text-xs text-gray-600">{place.formatted_address}</span>
                                                        </div>
                                                    )}
                                                    {placeDetailsMap[place.place_id]?.opening_hours && (
                                                        <div className="flex gap-2 items-center">
                                                            <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                                            <span className={`text-sm font-medium ${placeDetailsMap[place.place_id].opening_hours.open_now ? 'text-green-600' : 'text-red-500'}`}>
                                                                {placeDetailsMap[place.place_id].opening_hours.open_now ? t.results.openNow : t.results.closed}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )
                                ))}
                            </MapContainer>
                        )}
                    </div>

                </div>
            </div>
        </Layout>
    );
};
