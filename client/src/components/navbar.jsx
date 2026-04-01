import { useMemo } from "react";
import alien from '../assets/avatar-pfp/Alien.svg';
import batman from '../assets/avatar-pfp/Batman.svg';
import chickenLeg from '../assets/avatar-pfp/ChickenLeg.svg';
import deadPool from '../assets/avatar-pfp/DeadPool.svg';
import hotdog from '../assets/avatar-pfp/hotdog.svg';
import ironMan from '../assets/avatar-pfp/IronMan.svg';
import sailorCat from '../assets/avatar-pfp/Sailor-Cat.svg';
import wolverine from "../assets/avatar-pfp/Wolverine.svg";

export function Navbar({ user, avatar }) {

    const avatars = {
        Alien: alien,
        Batman: batman,
        ChickenLeg: chickenLeg,
        DeadPool: deadPool,
        hotdog: hotdog,
        IronMan: ironMan,
        SailorCat: sailorCat,
        Wolverine: wolverine,
    };


    return (

        <nav className="flex mx-auto p-6 bg-[#1a2e1a] rounded-3xl w-[90%] lg:w-[80%]">
            <div className="flex items-center justify-between w-full">
                <a href="#" className="flex items-center">
                    <span className="self-center whitespace-nowrap text-xl text-white font-semibold dark:text-gray-600">
                        Veto
                    </span>
                </a>
                {!!user && (
                    <div className="flex flex-row items-center">
                        <span className="mr-4 text-lg text-white">{user}</span>
                        <img
                            alt="User settings"
                            src={avatar}
                            className="rounded-full h-10 w-10"
                        />
                    </div>
                )}
            </div>
        </nav>

    )
}



        // <nav className="flex mx-auto items-center justify-between p-5 bg-gray-50 rounded-3xl w-full lg:w-[80%]">
        //     <a href="#" className="flex items-center">
        //         <span className="self-center whitespace-nowrap text-xl text-gray-700 font-semibold dark:text-gray-600">
        //             Veto
        //         </span>
        //     </a>
        //     {!!user && (
        //         <div className="flex flex-row items-center">
        //             <span className="mr-4 text-lg">{user}</span>
        //             <img
        //                 alt="User settings"
        //                 src={avatar}
        //                 className="rounded-full h-10 w-10"
        //             />
        //         </div>
        //     )}
        // </nav>

