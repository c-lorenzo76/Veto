import './App.css';
import {BrowserRouter, Routes, Route, Navigate, useParams} from "react-router-dom";
import {Home} from "./pages/Home";
import {Create} from "./pages/Create";
import {Join} from "./pages/Join";
import {Room} from "./pages/Room";
import {ROUTES} from "./constants/routes";
import {SocketProvider} from "./SocketContext";
import {LanguageProvider} from "./context/LanguageContext";
import { Toaster } from "@/components/ui/toaster";



// Old per-phase links (/lobby/CODE, /questions/CODE, /results/CODE) now land in the room.
const LegacyRoomRedirect = () => {
    const { code } = useParams();
    return <Navigate to={ROUTES.room(code)} replace/>;
};

const App = () => {
    return (
        <BrowserRouter>
            <LanguageProvider>
                <SocketProvider>
                    <Routes>
                        <Route index element={<Home/>}/>
                        <Route path={"create"} element={<Create/>}/>
                        <Route path={"join"} element={<Join/>}/>
                        <Route path={"room"} element={<Room/>}/>
                        <Route path={"lobby/:code"} element={<LegacyRoomRedirect/>}/>
                        <Route path={"questions/:code"} element={<LegacyRoomRedirect/>}/>
                        <Route path={"results/:code"} element={<LegacyRoomRedirect/>}/>
                    </Routes>
                </SocketProvider>
                <Toaster />
            </LanguageProvider>
        </BrowserRouter>
    )

};
export default App;