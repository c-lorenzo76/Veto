import { useState, useEffect, useMemo } from "react";
import { Layout } from "./Layout.jsx"
import { useParams, useNavigate } from "react-router-dom";
import { Button, Card } from "flowbite-react";
import { useSocket } from "@/SocketContext";
import { Progress } from "@/components/ui/progress";
import { Field, FieldLabel } from "@/components/ui/field";


export const Questions = () => {

    const { socket } = useSocket();
    const { code } = useParams();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [poll, setPoll] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0); // the index of the current question

    useEffect(() => {
        if (!socket) return;
        socket.emit('getPollData', { lobbyCode: code });
        socket.emit('updateLobby', { lobbyCode: code });
    }, [socket, code]);

    // Attach listeners ONCE and clean up
    useEffect(() => {
        if (!socket) return;

        const handleSetPoll = (poll) => {
            setPoll(poll);
        };
        const handleLobbyInfo = (lobby) => {
            setUsers(lobby.users);
        };
        const handleNavResults = () => {
            navigate(`/Results/${code}`);
        };
        const handleUserDisconnect = (discPlayer) => {
            setUsers((prevState) => prevState.filter((u) => u !== discPlayer));
        };
        const handleError = (error) => {
            console.error(error);
        };

        socket.on('setPoll', handleSetPoll);
        socket.on('lobbyInfo', handleLobbyInfo);
        socket.on('navResults', handleNavResults);
        socket.on('userDisconnect', handleUserDisconnect);
        socket.on('Error', handleError);

        return () => {
            socket.off('setPoll', handleSetPoll);
            socket.off('lobbyInfo', handleLobbyInfo);
            socket.off('navResults', handleNavResults);
            socket.off('userDisconnect', handleUserDisconnect);
            socket.off('Error', handleError);
        };
    }, [socket, code, navigate]);

    // the total votes for the option
    let totalVotes = useMemo(() => {
        console.log(poll?.questions[currentQuestion].options.reduce((acc, option) => acc + option.votes.length, 0) ?? 0);
        return (
            poll?.questions[currentQuestion].options.reduce((acc, option) => acc + option.votes.length, 0) ?? 0
        )
    }, [poll, currentQuestion]);

    const handleVote = (optionId) => {
        socket.emit("vote", { optionId: optionId, currentQuestion: currentQuestion, lobbyCode: code });
    };

    useEffect(() => {
        if(poll){
            if (totalVotes === users.length) {
                if (currentQuestion < poll?.questions.length - 1) {
                    setCurrentQuestion(currentQuestion + 1);
                } else {
                    // Future logic to emit to the backend and navigate to results
                    socket.emit("pollEnded", {code});
                }
            }
        }
    }, [totalVotes, currentQuestion]);

    return (
        <Layout user={socket.auth.token} avatar={socket.auth.avatar}>
            <div className={"w-full lg:w-[80%] rounded-xl mx-auto p-4 pt-6"}>
                <Field className="w-full">
                    <FieldLabel htmlFor="progress-poll">
                        <span>Poll Completion</span>
                        <span className="ml-auto">{((currentQuestion) / poll?.questions.length) * 100}%</span>
                    </FieldLabel>
                    <Progress value={((currentQuestion) / poll?.questions.length) * 100} id="progress-poll" />
                </Field>
            </div>

            <div className={"w-full lg:w-[80%] bg-[#f0f7f0] rounded-xl mx-auto p-8 shadow-sm "}>
                {poll && (
                    <>
                        <h1 className={"text-2xl font-bold text-center text-[#1a2e1a]"}>
                            {poll.questions[currentQuestion].question}
                        </h1>
                        {poll && (
                            <div className={"mt-6 grid sm:grid-cols-1 md:grid-cols-3 gap-4"}>
                                {poll.questions[currentQuestion].options.map(option => (
                                    <Card
                                        key={option.id}
                                        className={"relative transition-all duration-300 min-h-[130px] bg-white border border-[#c8dcc8] p-2"}
                                    >
                                        <div className={"z-10"}>
                                            <div className={"mb-2"}>
                                                <h2 className={"text-xl font-semibold text-[#1a2e1a]"}>{option.text}</h2>
                                            </div>
                                            <div className={"absolute bottom-5 right-5"}>
                                                {socket.auth.token && !option.votes.includes(socket.auth.token) ? (
                                                    <Button
                                                        className={"bg-[#2d6a2d] hover:bg-[#266226] text-white md:p-2"}
                                                        onClick={() => handleVote(option.id)}
                                                    >
                                                        Vote
                                                    </Button>
                                                ) : (
                                                    <Button disabled className={"bg-[#c8dcc8] text-[#1a2e1a] md:p-2"}>
                                                        Voted
                                                    </Button>
                                                )}
                                            </div>
                                            {option.votes.length > 0 && (
                                                <div className={"mt-2 flex gap-2 flex-wrap max-w-[75%]"}>
                                                    {option.votes.map((vote) => (
                                                        <div
                                                            key={vote}
                                                            className={"py-1 px-3 bg-[#1a2e1a] rounded-lg flex items-center justify-center shadow text-sm"}
                                                        >
                                                            <div className={"w-2 h-2 bg-[#2d6a2d] rounded-lg flex items-center justify-center shadow text-sm m-1 "}></div>
                                                            <div className={"text-gray-100"}>{vote}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className={"absolute top-3 right-5 p-2 text-sm font-semibold bg-[#1a2e1a] text-white rounded-lg z-10"}>
                                            {option.votes.length} / {users.length}{/* need to change the 0 to be the amount of players in the game*/}
                                        </div>
                                        <div
                                            className={"absolute bottom-0 inset-x-0 bg-[#c8dcc8] rounded-md overflow-hidden h-4"}
                                        >
                                            <div
                                                className="bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-300 h-full"
                                                style={{
                                                    width: `${totalVotes > 0
                                                            ? (option.votes.length / totalVotes) * 100
                                                            : 0
                                                        }%`,
                                                }}
                                            ></div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                    </>
                )}
            </div>
        </Layout>
    )

};


    // useEffect(() => {
    //     if (!socket) return;

    //     const handleSetPoll = (poll) => {
    //         console.log(`Questions: ${JSON.stringify(poll, null, 1)}`);
    //         setPoll(poll);
    //     };
    //     const handleLobbyInfo = (lobby) => {
    //         console.log('lobby info');
    //         setUsers(lobby.users);
    //     };
    //     const handleNavResults = () => {
    //         navigate(`/Results/${code}`);
    //     };
    //     const handleUserDisconnect = (discPlayer) => {
    //         setUsers((prevState) => prevState.filter((u) => u !== discPlayer));
    //         console.log(discPlayer, "Disconnected");
    //     };
    //     const handleError = (error) => {
    //         console.log(`There was an error ${error}`);
    //     };

    //     socket.emit('getPollData', { lobbyCode: code });
    //     socket.emit('updateLobby', { lobbyCode: code });

    //     socket.on('setPoll', handleSetPoll);
    //     socket.on('lobbyInfo', handleLobbyInfo);
    //     socket.on('navResults', handleNavResults);
    //     socket.on('userDisconnect', handleUserDisconnect);
    //     socket.on('Error', handleError);

    //     return () => {
    //         socket.off('setPoll', handleSetPoll);
    //         socket.off('lobbyInfo', handleLobbyInfo);
    //         socket.off('navResults', handleNavResults);
    //         socket.off('userDisconnect', handleUserDisconnect);
    //         socket.off('Error', handleError);
    //     };
    // }, [socket, code, navigate]);

    ////////////////////////////////////////////////////////////////

    // if(!socket){
    //     console.error('Socket is not initialized..');
    //     return;
    // }

    // useEffect(() => {

    //     // retrieves and sets the poll data
    //     socket.emit('getPollData', {lobbyCode: code});
    //     socket.on('setPoll', (poll) => {
    //         console.log(`Questions: ${JSON.stringify(poll,null, 1)}`);
    //         setPoll(poll);
    //     });

    //     // sets the users
    //     socket.emit('updateLobby', {lobbyCode: code});
    //     socket.on("lobbyInfo", (lobby) => {
    //         console.log('lobby info');
    //         setUsers(lobby.users)
    //     });

    //     socket.on("navResults", () => {
    //         navigate(`/Results/${code}`);
    //     });

    //     // updates users when a user disconnects
    //     socket.on("userDisconnect", (discPlayer) => {
    //         setUsers((prevState) => prevState.filter((u) => u !== discPlayer));
    //         console.log(discPlayer, "Disconnected")
    //     });

    //     socket.on('Error', (error) => {
    //         console.log(`There was an error ${error}`);
    //     });

    // }, [code, socket]);