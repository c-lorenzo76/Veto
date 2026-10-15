import "../index.css";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/navbar.jsx";
import { Footer } from "../components/Footer.jsx";

export const Layout = ({children, user, avatar}) => {
    return (
        <div className="p-6 bg-gradient-to-b from-page-top via-page-mid to-page-bottom min-h-screen flex flex-col">
            <Navbar user={user} avatar={avatar}/>
            {/* flex-1 pushes the footer to the bottom of the screen on short pages */}
            <main className="flex-1 flex flex-col mt-1">{children}</main>
            {/* <div className="grid place-items-center">{children}</div> */}
            <Footer/>
            <Outlet/>
        </div>
    );
};