import './App.css';
import {BrowserRouter, Routes, Route} from "react-router-dom";
import {Home} from "./pages/Home";
import {Q1} from "./pages/Q1";
import {Create} from "./pages/Create";
import {Join} from "./pages/Join";
import {Lobby} from "./pages/Lobby";
import {Questions} from "./pages/Questions";
import {Results} from "./pages/Results";
import {SocketProvider} from "./SocketContext";
import { Toaster } from "@/components/ui/toaster";



const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route index element={<Home/>}/>
                <Route path={"Q1"} element={<SocketProvider><Q1/></SocketProvider>}/>
                <Route path={"Create"} element={<SocketProvider><Create/></SocketProvider>}/>
                <Route path={"Join"} element={<SocketProvider><Join/></SocketProvider>}/>
                <Route path={"Lobby/:code"} element={<SocketProvider><Lobby/></SocketProvider>}/>
                <Route path={"Questions/:code"} element={<SocketProvider><Questions/></SocketProvider>}/>
                <Route path={"Results/:code"} element={<SocketProvider><Results/></SocketProvider>}/>
            </Routes>
            <Toaster />
        </BrowserRouter>
    )

};
export default App;