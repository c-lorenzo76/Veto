const cors = require("cors");
const express = require("express");
const { Server } = require("socket.io");
require('dotenv').config();
const axios = require('axios');


const app = express();
app.use(cors({ origin: "http://localhost:5173" }));

const photoCache = new Map();

app.get('/api/place-photo', async (req, res) => {
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
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

let lobbies = {};

// random code generated for lobby
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase(); // all 36 a-z 1-9 characters, size 6, uppercased
}

// socket connection
io.use((socket, next) => {
    const user = socket.handshake.auth.token;
    const avatar = socket.handshake.auth.avatar;
    if (user) {
        socket.data = { ...socket.data, user: user, avatar: avatar };
    }
    next();
});


io.on("connection", socket => {
    console.log("user connected: ", socket.data.user);

    socket.on("createLobby", ({ coords }) => {
        let code = generateCode(); // generates code

        while (lobbies[code]) {             // checks to see no other lobby w/ code
            code = generateCode();
        }

        lobbies[code] = {
            host: socket.data.user,
            users: [{ name: socket.data.user, avatar: socket.data.avatar || null }],
            coords: coords,
            poll: [
                {
                    id: 1,
                    question: "What is your current top priority for your meal?",
                    options: [
                        { id: 1, text: "Ambiance", votes: [] },
                        { id: 2, text: "Budget", votes: [] },
                        { id: 3, text: "Cuisine", votes: [] },
                        { id: 4, text: "Distance", votes: [] },
                    ],
                },
                {
                    id: 2,
                    question: "What kind of ambiance are you looking for?",
                    options: [
                        { id: 1, text: "Casual and Cozy", votes: [] },
                        { id: 2, text: "Trendy and Modern", votes: [] },
                        { id: 3, text: "Romantic and Intimate", votes: [] },
                        { id: 4, text: "Family-friendly", votes: [] },
                        { id: 5, text: "Lively and Social", votes: [] },
                    ],
                },
                {
                    id: 3,
                    question: "What is your preferred price range?",
                    options: [
                        { id: 1, text: "$", votes: [] },
                        { id: 2, text: "$$", votes: [] },
                        { id: 3, text: "$$$", votes: [] },
                        { id: 4, text: "$$$$", votes: [] },
                    ],
                },
                {
                    id: 4,
                    question: "What type of cuisine are you in the mood for?",
                    options: [
                        { id: 1, text: "Italian", votes: [] },
                        { id: 2, text: "Mexican", votes: [] },
                        { id: 3, text: "Chinese", votes: [] },
                        { id: 4, text: "Japanese", votes: [] },
                        { id: 5, text: "Mediterranean", votes: [] },
                        { id: 6, text: "American", votes: [] },
                        { id: 7, text: "French", votes: [] },
                        { id: 8, text: "Thai", votes: [] },
                    ],
                },
                {
                    id: 5,
                    question: "How far are you willing to travel?",
                    options: [
                        { id: 1, text: "Walking distance (0-1 miles)", votes: [] },
                        { id: 2, text: "Short drive (1-5 miles)", votes: [] },
                        { id: 3, text: "Moderate drive (5-15 miles)", votes: [] },
                        { id: 4, text: "Long drive (15+ miles)", votes: [] },
                    ],
                },
            ],
        };

        socket.join(code);
        socket.emit("lobbyCreated", code);

        console.log(`Lobby created with code: ${code}`);
    });

    socket.on("joinLobby", ({ lobbyCode }) => {
        if (lobbies[lobbyCode]) {
            socket.join(lobbyCode);
            const lobbyObj = lobbies[lobbyCode];
            if (!lobbyObj.users.some(u => u.name === socket.data.user)) {
                lobbyObj.users.push({ name: socket.data.user, avatar: socket.data.avatar || null });
            }

            // emit users as objects { name, avatar }
            io.to(lobbyCode).emit("lobbyInfo", {
                code: lobbyCode,
                users: lobbyObj.users, // already objects
                host: lobbyObj.host,
            });

            console.log(`User ${socket.data.user} joined lobby ${lobbyCode}`);

        }
        else {
            socket.emit('Error', 'Error with joinLobby');
        }
    });

    socket.on("updateLobby", ({ lobbyCode }) => {
        if (lobbies[lobbyCode]) {
            const lobby = lobbies[lobbyCode];
            io.to(lobbyCode).emit("lobbyInfo", {
                code: lobbyCode,
                users: lobby.users,
                host: lobby.host,
            });
            console.log(`Updated lobby information on Lobby: ${lobbyCode}`)
        } else {
            socket.emit('Error', "Error with updateLobby");
        }
    });

    socket.on("startGame", ({ lobbyCode }) => {
        io.to(lobbyCode).emit("gameStarted")
    });

    socket.on("getPollData", ({ lobbyCode }) => {
        if (lobbies[lobbyCode]) {
            const lobby = lobbies[lobbyCode];

            // want to know if I can just send it without doing 'questions:' bc it sets an array in another array for no reason
            io.to(lobbyCode).emit("setPoll", {
                questions: lobby.poll,
            });

            console.log(`Sent poll to lobby: ${lobbyCode}`);
        } else {
            console.log("Lobby not found for code:", lobbyCode);
            socket.emit('Error', "Error with getPollData");
        }
    });

    socket.on("vote", ({ optionId, currentQuestion, lobbyCode }) => {
        let lobby = lobbies[lobbyCode];

        if (!lobby) {
            return socket.emit('Error', "Error with vote, no lobby");
        }

        lobby.poll[currentQuestion].options.forEach((option) => {
            option.votes = option.votes.filter((user) => user !== socket.data.user);
        });
        const option = lobby.poll[currentQuestion].options.find((o) => o.id === optionId);
        if (!option) {
            return;
        }

        option.votes.push(socket.data.user);

        io.to(lobbyCode).emit("setPoll", {
            questions: lobby.poll,
        });
    });


    socket.on("getPlaceDetails", async ({ placeId }) => {
        try {
            const fields = 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,opening_hours,price_level,url,photos';
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.SECRET_KEY}`;
            const response = await axios.get(url);
            socket.emit("placeDetails", response.data.result);
        } catch (error) {
            console.error('Error fetching place details:', error);
            socket.emit('Error', 'Error fetching place details');
        }
    });

    socket.on("pollEnded", async ({ code }) => {
        if (lobbies[code]) {

            io.to(code).emit("navResults");

            try {
                await emitGetPlaces(code); // Await the promise
                console.log('Sent to function emitGetPlaces');
            } catch (error) {
                console.error('Error in emitGetPlaces:', error);
            }

        } else {
            console.log("Lobby not found for code:", code);
            socket.emit('Error', "Error with getPollData");
        }
    });

    socket.on("disconnect", () => {
        // inside socket.on("disconnect", ...)
        for (const [code, lobby] of Object.entries(lobbies)) {
            if (lobby.users.some(u => u.name === socket.data.user)) {

                lobby.users = lobby.users.filter(u => u.name !== socket.data.user);

                lobby.poll.forEach(question => {
                    question.options.forEach(option => {
                        option.votes = option.votes.filter(vote => vote !== socket.data.user);
                    });
                });

                if (lobby.users.length === 0) {
                    delete lobbies[code];
                    console.log(`Lobby with code ${code} has been removed`)
                } else {
                    socket.broadcast.to(code).emit("userDisconnect", socket.data.user);
                }
                break;
            }
        }
    });

});

async function emitGetPlaces(code) {
    const lobby = lobbies[code];

    if (lobby) {
        const selectedOptions = getMostVotedOptions(lobby);
        const places = await searchPlaces(selectedOptions, lobby.coords);

        io.to(code).emit('getPlaces', { places, coords: lobby.coords });
        console.log('SENT TO RESULTS', places[0]);
    }
}

function getMostVotedOptions(lobby) {
    return lobby.poll.map((question) => {
        const maxVotes = Math.max(...question.options.map(o => o.votes.length));
        const tied = question.options.filter(o => o.votes.length === maxVotes);
        // if tied, randomly pick one
        return tied[Math.floor(Math.random() * tied.length)].text;
    });
}

async function searchPlaces(selectedOptions, coords) {
    const ambiance = selectedOptions[1];
    const cuisine  = selectedOptions[3];
    const distance = selectedOptions[4];

    const distanceToRadius = {
        "Walking distance (0-1 miles)": 1610,
        "Short drive (1-5 miles)":      8047,
        "Moderate drive (5-15 miles)":  24145,
        "Long drive (15+ miles)":       50000,
    };

    const radius = distanceToRadius[distance] || 8047;
    const query  = `${cuisine} ${ambiance} restaurant`;

    console.log(`Searching: "${query}" within ${radius}m of ${coords}`);

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${coords}&radius=${radius}&type=restaurant&key=${process.env.SECRET_KEY}`;

    try {
        const response = await axios.get(url);
        return response.data.results;
    } catch (error) {
        console.error('Error searching places:', error);
        return [];
    }
}

server.listen(8000, () => {
    console.log("Listening on Port:8000");
});
