const cors = require("cors");
const express = require("express");
const { Server } = require("socket.io");
require('dotenv').config();
const axios = require('axios');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

const photoCache = new Map();

const photoLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/api/place-photo', photoLimiter, async (req, res) => {
    const { ref } = req.query;
    if (!ref) return res.status(400).send('Missing photo_reference');

    if (photoCache.has(ref)) {
        const { data, contentType } = photoCache.get(ref);
        res.setHeader('Content-Type', contentType);
        return res.send(data);
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${ref}&key=${process.env.SECRET_KEY}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'];
        const data = Buffer.from(response.data);

        photoCache.set(ref, { data, contentType });

        res.setHeader('Content-Type', contentType);
        res.send(data);
    } catch (error) {
        console.error('Error fetching place photo:', error);
        res.status(500).send('Error fetching photo');
    }
});

const server = require("http").createServer(app);
const io = new Server(server, {
    cors: {
        origin: CLIENT_ORIGIN,
        methods: ["GET", "POST"],
    },
});

let lobbies = {};

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.use((socket, next) => {
    const user = socket.handshake.auth.token;
    const avatar = socket.handshake.auth.avatar;
    if (user) {
        socket.data = { ...socket.data, user: user, avatar: avatar };
    }
    next();
});

// ── Input validation ──────────────────────────────────────────

const lobbyCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/);
const usernameSchema = z.string().min(1).max(30);
const placeIdSchema = z.string().min(1).max(200);

const schemas = {
    createLobby: z.object({
        coords: z.string().regex(/^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/),
    }),
    joinLobby: z.object({ lobbyCode: lobbyCodeSchema }),
    updateLobby: z.object({ lobbyCode: lobbyCodeSchema }),
    startGame: z.object({ lobbyCode: lobbyCodeSchema }),
    kickUser: z.object({ lobbyCode: lobbyCodeSchema, targetUser: usernameSchema }),
    getPollData: z.object({ lobbyCode: lobbyCodeSchema }),
    vote: z.object({ optionId: z.number().int().positive(), lobbyCode: lobbyCodeSchema }),
    voteRestaurant: z.object({ lobbyCode: lobbyCodeSchema, placeId: placeIdSchema }),
    cursorMove: z.object({
        lobbyCode: lobbyCodeSchema,
        x: z.number().finite(),
        y: z.number().finite(),
    }),
    cursorLeave: z.object({ lobbyCode: lobbyCodeSchema }),
    getPlaceDetails: z.object({ placeId: placeIdSchema }),
    transferHost: z.object({ lobbyCode: lobbyCodeSchema }),
};

function withValidation(socket, schema, handler) {
    return (payload) => {
        const result = schema.safeParse(payload);
        if (!result.success) {
            socket.emit('Error', 'Invalid request');
            return;
        }
        return handler(result.data);
    };
}

// ── Per-socket rate limiting ──────────────────────────────────

const socketRateLimits = new Map();

function isRateLimited(socket, key, limit, windowMs) {
    const now = Date.now();
    const mapKey = `${socket.id}:${key}`;
    const entry = socketRateLimits.get(mapKey) || { count: 0, windowStart: now };

    if (now - entry.windowStart > windowMs) {
        entry.count = 0;
        entry.windowStart = now;
    }

    entry.count += 1;
    socketRateLimits.set(mapKey, entry);
    return entry.count > limit;
}

function clearRateLimits(socket) {
    for (const key of socketRateLimits.keys()) {
        if (key.startsWith(`${socket.id}:`)) socketRateLimits.delete(key);
    }
}

io.on("connection", socket => {
    console.log("user connected: ", socket.data.user);

    socket.on("createLobby", withValidation(socket, schemas.createLobby, ({ coords }) => {
        if (isRateLimited(socket, 'createLobby', 5, 60_000)) {
            return socket.emit('Error', 'Too many lobbies created — slow down');
        }

        let code = generateCode();
        while (lobbies[code]) code = generateCode();

        lobbies[code] = {
            host: socket.data.user,
            users: [{ name: socket.data.user, avatar: socket.data.avatar || null }],
            coords: coords,
            phase: 'lobby',
            lockedPlayers: [],
            currentQuestion: 0,
            questionTimer: null,
            questionStartedAt: null,
            restaurantVotes: {},
            finalVoteTimer: null,
            places: [],
            poll: [
                // Q1: Meal priority
                {
                    id: 1,
                    options: [
                        { id: 1, votes: [] }, // Ambiance
                        { id: 2, votes: [] }, // Budget
                        { id: 3, votes: [] }, // Cuisine
                        { id: 4, votes: [] }, // Distance
                    ],
                },
                // Q2: Price range
                {
                    id: 2,
                    options: [
                        { id: 1, votes: [] }, // $
                        { id: 2, votes: [] }, // $$
                        { id: 3, votes: [] }, // $$$
                        { id: 4, votes: [] }, // $$$$
                    ],
                },
                // Q3: Cuisine
                {
                    id: 3,
                    options: [
                        { id: 1, votes: [] }, // Italian
                        { id: 2, votes: [] }, // Mexican
                        { id: 3, votes: [] }, // Chinese
                        { id: 4, votes: [] }, // Japanese
                        { id: 5, votes: [] }, // Mediterranean
                        { id: 6, votes: [] }, // American
                        { id: 7, votes: [] }, // French
                        { id: 8, votes: [] }, // Thai
                    ],
                },
                // Q4: Travel distance
                {
                    id: 4,
                    options: [
                        { id: 1, votes: [] }, // Walking distance (0-1 miles)
                        { id: 2, votes: [] }, // Short drive (1-5 miles)
                        { id: 3, votes: [] }, // Moderate drive (5-15 miles)
                        { id: 4, votes: [] }, // Long drive (15+ miles)
                    ],
                },
            ],
        };

        socket.join(code);
        socket.emit("lobbyCreated", code);
        console.log(`Lobby created: ${code}`);
    }));

    socket.on("joinLobby", withValidation(socket, schemas.joinLobby, ({ lobbyCode }) => {
        const lobbyObj = lobbies[lobbyCode];
        if (!lobbyObj) return socket.emit('Error', 'Lobby not found');

        socket.join(lobbyCode);
        if (!lobbyObj.users.some(u => u.name === socket.data.user)) {
            lobbyObj.users.push({ name: socket.data.user, avatar: socket.data.avatar || null });
        }

        io.to(lobbyCode).emit("lobbyInfo", {
            code: lobbyCode,
            users: lobbyObj.users,
            host: lobbyObj.host,
            phase: lobbyObj.phase,
        });

        socket.emit("lobbyJoined", lobbyCode);
        socket.emit('selfInfo', { isHost: lobbyObj.host === socket.data.user });

        // Send current game state if joining mid-game (observer)
        if (lobbyObj.phase === 'poll') {
            socket.emit('gameStarted', { lockedPlayers: lobbyObj.lockedPlayers });
            socket.emit('setPoll', { questions: lobbyObj.poll });
            socket.emit('phase_start', {
                phase: 'poll',
                questionIndex: lobbyObj.currentQuestion,
                duration: 30,
                startedAt: lobbyObj.questionStartedAt,
                lockedPlayers: lobbyObj.lockedPlayers,
            });
        } else if (lobbyObj.phase === 'finalVote') {
            socket.emit('gameStarted', { lockedPlayers: lobbyObj.lockedPlayers });
            socket.emit('navResults');
            if (lobbyObj.places.length > 0) {
                socket.emit('getPlaces', {
                    places: lobbyObj.places,
                    coords: lobbyObj.coords,
                    lockedPlayers: lobbyObj.lockedPlayers,
                    radiusUsed: lobbyObj.searchMeta?.radiusUsed,
                    searchBroadened: lobbyObj.searchMeta?.searchBroadened,
                });
            }
            const voted = Object.keys(lobbyObj.restaurantVotes).length;
            socket.emit('restaurantVoteCount', { voted, total: lobbyObj.lockedPlayers.length });
        }

        console.log(`User ${socket.data.user} joined lobby ${lobbyCode}`);
    }));

    socket.on("updateLobby", withValidation(socket, schemas.updateLobby, ({ lobbyCode }) => {
        const lobby = lobbies[lobbyCode];
        if (!lobby) return socket.emit('Error', "Error with updateLobby");

        io.to(lobbyCode).emit("lobbyInfo", {
            code: lobbyCode,
            users: lobby.users,
            host: lobby.host,
            phase: lobby.phase,
        });

        // Tell this specific socket whether they're the host (server-authoritative)
        socket.emit('selfInfo', { isHost: lobby.host === socket.data.user });

        console.log(`Updated lobby: ${lobbyCode}`);
    }));

    socket.on("startGame", withValidation(socket, schemas.startGame, ({ lobbyCode }) => {
        const lobby = lobbies[lobbyCode];
        if (!lobby || lobby.host !== socket.data.user) return;

        lobby.lockedPlayers = [...lobby.users];
        lobby.phase = 'poll';
        lobby.currentQuestion = 0;
        lobby.restaurantVotes = {};

        io.to(lobbyCode).emit("gameStarted", { lockedPlayers: lobby.lockedPlayers });
        startQuestion(lobbyCode, 0);
    }));

    socket.on("kickUser", withValidation(socket, schemas.kickUser, ({ lobbyCode, targetUser }) => {
        const lobby = lobbies[lobbyCode];
        if (!lobby || lobby.host !== socket.data.user) return;

        lobby.users = lobby.users.filter(u => u.name !== targetUser);

        for (const [, s] of io.sockets.sockets) {
            if (s.data.user === targetUser) {
                s.emit("kicked");
                s.leave(lobbyCode);
                break;
            }
        }

        io.to(lobbyCode).emit("lobbyInfo", {
            code: lobbyCode,
            users: lobby.users,
            host: lobby.host,
            phase: lobby.phase,
        });

        console.log(`Host kicked ${targetUser} from lobby ${lobbyCode}`);
    }));

    socket.on("transferHost", withValidation(socket, schemas.transferHost, ({ lobbyCode }) => {
        const lobby = lobbies[lobbyCode];
        if (!lobby || lobby.host !== socket.data.user) return;

        const successor = lobby.users.find(u => u.name !== socket.data.user);

        if (!successor) {
            clearTimeout(lobby.questionTimer);
            clearTimeout(lobby.finalVoteTimer);
            io.to(lobbyCode).emit('hostLeft');
            delete lobbies[lobbyCode];
            console.log(`Host left with no successor — lobby ${lobbyCode} destroyed`);
            return;
        }

        lobby.host = successor.name;

        io.to(lobbyCode).emit('lobbyInfo', {
            code: lobbyCode,
            users: lobby.users,
            host: lobby.host,
            phase: lobby.phase,
        });
        io.to(lobbyCode).emit('hostTransferred', { newHost: successor.name });

        const room = io.sockets.adapter.rooms.get(lobbyCode);
        if (room) {
            for (const socketId of room) {
                const s = io.sockets.sockets.get(socketId);
                if (s) s.emit('selfInfo', { isHost: lobby.host === s.data.user });
            }
        }

        console.log(`Host transferred in lobby ${lobbyCode}: ${socket.data.user} -> ${successor.name}`);
    }));

    socket.on("getPollData", withValidation(socket, schemas.getPollData, ({ lobbyCode }) => {
        const lobby = lobbies[lobbyCode];
        if (!lobby) return socket.emit('Error', "Error with getPollData");

        socket.emit("setPoll", { questions: lobby.poll });

        // If already in poll phase, send current phase state too
        if (lobby.phase === 'poll') {
            socket.emit('phase_start', {
                phase: 'poll',
                questionIndex: lobby.currentQuestion,
                duration: 30,
                startedAt: lobby.questionStartedAt,
                lockedPlayers: lobby.lockedPlayers,
            });
        }

        console.log(`Sent poll to lobby: ${lobbyCode}`);
    }));

    socket.on("vote", withValidation(socket, schemas.vote, ({ optionId, lobbyCode }) => {
        if (isRateLimited(socket, 'vote', 10, 2_000)) return;

        const lobby = lobbies[lobbyCode];
        if (!lobby) return socket.emit('Error', "Error with vote, no lobby");

        // Only locked-in players can vote
        const isLocked = lobby.lockedPlayers?.some(p => p.name === socket.data.user);
        if (!isLocked) return;

        const currentQuestion = lobby.currentQuestion;

        // Remove any previous vote on this question
        lobby.poll[currentQuestion].options.forEach(option => {
            option.votes = option.votes.filter(user => user !== socket.data.user);
        });

        const option = lobby.poll[currentQuestion].options.find(o => o.id === optionId);
        if (!option) return;

        option.votes.push(socket.data.user);

        io.to(lobbyCode).emit("setPoll", { questions: lobby.poll });

        // Check if all locked players have voted on this question
        const question = lobby.poll[currentQuestion];
        const votedUsers = new Set(question.options.flatMap(o => o.votes));
        const allVoted = lobby.lockedPlayers.every(p => votedUsers.has(p.name));

        if (allVoted) {
            clearTimeout(lobby.questionTimer);
            advanceQuestion(lobbyCode);
        }
    }));

    socket.on("voteRestaurant", withValidation(socket, schemas.voteRestaurant, ({ lobbyCode, placeId }) => {
        if (isRateLimited(socket, 'voteRestaurant', 10, 2_000)) return;

        const lobby = lobbies[lobbyCode];
        if (!lobby) return;

        const isLocked = lobby.lockedPlayers?.some(p => p.name === socket.data.user);
        if (!isLocked) return;

        lobby.restaurantVotes[socket.data.user] = placeId;

        const voted = Object.keys(lobby.restaurantVotes).length;
        const total = lobby.lockedPlayers.length;

        io.to(lobbyCode).emit('restaurantVoteCount', { voted, total });

        if (voted === total) {
            clearTimeout(lobby.finalVoteTimer);
            endFinalVote(lobbyCode);
        }
    }));

    socket.on("cursorMove", withValidation(socket, schemas.cursorMove, ({ lobbyCode, x, y }) => {
        socket.to(lobbyCode).emit("cursorMove", {
            user: socket.data.user,
            avatar: socket.data.avatar,
            x,
            y,
        });
    }));

    socket.on("cursorLeave", withValidation(socket, schemas.cursorLeave, ({ lobbyCode }) => {
        socket.to(lobbyCode).emit("cursorLeave", { user: socket.data.user });
    }));

    socket.on("getPlaceDetails", withValidation(socket, schemas.getPlaceDetails, async ({ placeId }) => {
        try {
            const fields = 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,opening_hours,price_level,url,photos';
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.SECRET_KEY}`;
            const response = await axios.get(url);
            socket.emit("placeDetails", response.data.result);
        } catch (error) {
            console.error('Error fetching place details:', error);
            socket.emit('Error', 'Error fetching place details');
        }
    }));

    socket.on("disconnect", () => {
        clearRateLimits(socket);
        for (const [code, lobby] of Object.entries(lobbies)) {
            if (lobby.users.some(u => u.name === socket.data.user)) {

                // Host left — destroy the lobby
                if (lobby.host === socket.data.user) {
                    clearTimeout(lobby.questionTimer);
                    clearTimeout(lobby.finalVoteTimer);
                    io.to(code).emit('hostLeft');
                    delete lobbies[code];
                    console.log(`Host left — lobby ${code} destroyed`);
                    return;
                }

                lobby.users = lobby.users.filter(u => u.name !== socket.data.user);
                // During the poll, drop the leaver from the locked roster so vote
                // totals (x / N) reflect who is actually still playing.
                if (lobby.phase === 'poll') {
                    lobby.lockedPlayers = lobby.lockedPlayers.filter(p => p.name !== socket.data.user);
                }
                lobby.poll.forEach(question => {
                    question.options.forEach(option => {
                        option.votes = option.votes.filter(vote => vote !== socket.data.user);
                    });
                });

                if (lobby.users.length === 0) {
                    delete lobbies[code];
                    console.log(`Lobby ${code} removed — no users left`);
                } else {
                    socket.broadcast.to(code).emit("userDisconnect", socket.data.user);
                }
                break;
            }
        }
    });
});

// ── Game flow helpers ─────────────────────────────────────────

function startQuestion(code, questionIndex) {
    const lobby = lobbies[code];
    if (!lobby) return;

    lobby.currentQuestion = questionIndex;
    lobby.questionStartedAt = Date.now();

    if (lobby.questionTimer) clearTimeout(lobby.questionTimer);
    lobby.questionTimer = setTimeout(() => advanceQuestion(code), 30_000);

    io.to(code).emit('phase_start', {
        phase: 'poll',
        questionIndex,
        duration: 30,
        startedAt: lobby.questionStartedAt,
        lockedPlayers: lobby.lockedPlayers,
    });

    console.log(`Question ${questionIndex} started in lobby ${code}`);
}

function advanceQuestion(code) {
    const lobby = lobbies[code];
    if (!lobby) return;

    const currentQ = lobby.poll[lobby.currentQuestion];
    const hasAnyVotes = currentQ.options.some(o => o.votes.length > 0);

    if (!hasAnyVotes) {
        const extension = 10;
        io.to(code).emit('phase_extend', { addedSeconds: extension });
        lobby.questionTimer = setTimeout(() => advanceQuestion(code), extension * 1000);
        console.log(`No votes in lobby ${code} — extending by ${extension}s`);
        return;
    }

    if (lobby.currentQuestion < lobby.poll.length - 1) {
        startQuestion(code, lobby.currentQuestion + 1);
    } else {
        endPoll(code);
    }
}

async function endPoll(code) {
    const lobby = lobbies[code];
    if (!lobby) return;

    lobby.phase = 'finalVote';
    lobby.restaurantVotes = {};

    io.to(code).emit("navResults");

    try {
        await emitGetPlaces(code);

        const duration = 90;
        const startedAt = Date.now();
        lobby.finalVoteTimer = setTimeout(() => endFinalVote(code), duration * 1000);

        io.to(code).emit('phase_start', {
            phase: 'finalVote',
            duration,
            startedAt,
            lockedPlayers: lobby.lockedPlayers,
        });

        console.log(`Final vote started in lobby ${code}`);
    } catch (error) {
        console.error('Error in endPoll:', error);
    }
}

function endFinalVote(code) {
    const lobby = lobbies[code];
    if (!lobby) return;

    const votes = lobby.restaurantVotes || {};
    const voteCount = Object.keys(votes).length;

    if (voteCount === 0) {
        const extension = 15;
        io.to(code).emit('phase_extend', { addedSeconds: extension });
        lobby.finalVoteTimer = setTimeout(() => endFinalVote(code), extension * 1000);
        console.log(`No restaurant votes in lobby ${code} — extending by ${extension}s`);
        return;
    }

    // Tally votes
    const tally = {};
    for (const placeId of Object.values(votes)) {
        tally[placeId] = (tally[placeId] || 0) + 1;
    }

    const maxVotes = Math.max(...Object.values(tally));
    const tied = Object.keys(tally).filter(id => tally[id] === maxVotes);
    const winnerPlaceId = tied[Math.floor(Math.random() * tied.length)];
    const winnerPlace = lobby.places?.find(p => p.place_id === winnerPlaceId);

    lobby.phase = 'done';

    const tiedPlaces = tied.length > 1
        ? tied.map(id => lobby.places?.find(p => p.place_id === id)).filter(Boolean)
        : null;

    io.to(code).emit('winner', { place: winnerPlace, tiedPlaces });
    console.log(`Winner in lobby ${code}: ${winnerPlace?.name}`);
}

async function emitGetPlaces(code) {
    const lobby = lobbies[code];
    if (!lobby) return;

    const selectedOptions = getMostVotedOptions(lobby);
    const { results: places, radiusUsed, searchBroadened } = await searchPlaces(selectedOptions, lobby.coords);

    lobby.places = places;
    lobby.searchMeta = { radiusUsed, searchBroadened };

    io.to(code).emit('getPlaces', {
        places,
        coords: lobby.coords,
        lockedPlayers: lobby.lockedPlayers,
        radiusUsed,
        searchBroadened,
    });

    console.log('SENT TO RESULTS', places[0]);
}

function getMostVotedOptions(lobby) {
    return lobby.poll.map((question) => {
        const maxVotes = Math.max(...question.options.map(o => o.votes.length));
        const tied = question.options.filter(o => o.votes.length === maxVotes);
        return tied[Math.floor(Math.random() * tied.length)].id;
    });
}

// Q4 (distance) option id -> search radius in meters
const DISTANCE_TO_RADIUS = {
    1: 1610,    // Walking distance
    2: 8047,    // Short drive
    3: 24145,   // Moderate drive
    4: 50000,   // Long drive
};

// Q3 (cuisine) option id -> English search term used against the Places API
const CUISINE_SEARCH_TERMS = {
    1: 'Italian',
    2: 'Mexican',
    3: 'Chinese',
    4: 'Japanese',
    5: 'Mediterranean',
    6: 'American',
    7: 'French',
    8: 'Thai',
};

// Ordered ladder of tiers used to escalate the search radius when results are sparse.
const RADIUS_LADDER = [1610, 8047, 24145, 50000];

const MIN_ACCEPTABLE_RESULTS = 5;

async function searchPlaces(selectedOptions, coords) {
    const priceId    = selectedOptions[1];
    const cuisineId  = selectedOptions[2];
    const distanceId = selectedOptions[3];

    // Q2 (price) option id -> Google Places price level
    const priceToLevel = {
        1: 1,  // $
        2: 2,  // $$
        3: 3,  // $$$
        4: 4,  // $$$$
    };

    const cuisine = CUISINE_SEARCH_TERMS[cuisineId];
    const startingRadius = DISTANCE_TO_RADIUS[distanceId] || 8047;
    const priceLevel = priceToLevel[priceId];
    // Note: Google's Places API `keyword` param is documented for Nearby Search,
    // not Text Search — Text Search only formally supports `query` as its text
    // signal, so `keyword` would be silently ignored here. Instead we strengthen
    // the free-text query itself: leading with the cuisine and pairing it with
    // "food" (in addition to "restaurant") reinforces the cuisine term relative
    // to the generic "restaurant" word, biasing relevance ranking toward it.
    const query = `${cuisine} food restaurant`;

    let startIndex = RADIUS_LADDER.indexOf(startingRadius);
    if (startIndex === -1) startIndex = 1;

    let results = [];
    let radiusUsed = startingRadius;
    let searchBroadened = false;

    for (let i = startIndex; i < RADIUS_LADDER.length; i++) {
        const radius = RADIUS_LADDER[i];
        radiusUsed = radius;

        console.log(`Searching: "${query}" within ${radius}m of ${coords}, price level ${priceLevel}`);

        let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${coords}&radius=${radius}&type=restaurant&key=${process.env.SECRET_KEY}`;
        if (priceLevel) {
            url += `&maxprice=${priceLevel}`;
        }

        try {
            const response = await axios.get(url);
            if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
                console.error('Places API error:', response.data.status, response.data.error_message);
                break;
            }

            results = response.data.results || [];

            if (results.length >= MIN_ACCEPTABLE_RESULTS || i === RADIUS_LADDER.length - 1) {
                break;
            }

            // Not enough results yet and there's a larger tier available — broaden and retry.
            searchBroadened = true;
        } catch (error) {
            console.error('Error searching places:', error);
            return { results: [], radiusUsed, searchBroadened };
        }
    }

    return { results, radiusUsed, searchBroadened };
}

if (require.main === module) {
    server.listen(8000, () => {
        console.log("Listening on Port:8000");
    });
}
