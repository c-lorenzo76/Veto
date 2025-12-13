// AvatarSelection.jsx
import React from 'react';
import alien from '../assets/avatar-pfp/Alien.svg';
import batman from '../assets/avatar-pfp/Batman.svg';
import chickenLeg from '../assets/avatar-pfp/ChickenLeg.svg';
import deadPool from '../assets/avatar-pfp/DeadPool.svg';
import hotdog from '../assets/avatar-pfp/hotdog.svg';
import ironMan from '../assets/avatar-pfp/IronMan.svg';
import sailorCat from '../assets/avatar-pfp/Sailor-Cat.svg';
import wolverine from "../assets/avatar-pfp/Wolverine.svg";
import chocobar from "../assets/avatar-pfp/chocobar.svg";
import cookie from "../assets/avatar-pfp/cookie.svg";
import cptamerica from "../assets/avatar-pfp/cptamerica.svg";
import goofy from "../assets/avatar-pfp/goofy.svg";
import hamburger from "../assets/avatar-pfp/hamburger.svg";
import icecream from "../assets/avatar-pfp/icecream.svg";
import mulan from "../assets/avatar-pfp/mulan.svg";
import pizza from "../assets/avatar-pfp/pizza.svg";
import poohbear from "../assets/avatar-pfp/poohbear.svg";
import popcorn from "../assets/avatar-pfp/popcorn.svg";
import sailormoon from "../assets/avatar-pfp/sailormoon.svg";
import snowWhite from "../assets/avatar-pfp/Snow-White.svg";

const avatars = {
    Alien: alien,
    Batman: batman,
    ChickenLeg: chickenLeg,
    DeadPool: deadPool,
    hotdog: hotdog,
    IronMan: ironMan,
    SailorCat: sailorCat,
    Wolverine: wolverine,
    Chocobar: chocobar,
    Cookie: cookie,
    CaptainAmerica: cptamerica,
    Goofy: goofy,
    Hamburger: hamburger,
    Icecream: icecream,
    Mulan: mulan,
    Pizza: pizza,
    PoohBear: poohbear,
    Popcorn: popcorn,
    SailorMoon: sailormoon,
    SnowWhite: snowWhite,
};

const AvatarSelection = ({ onSelect }) => {
    return (
        <div className="grid grid-cols-4 gap-8 gap-x-14 py-4 mx-auto">
            {Object.entries(avatars).map(([name, src]) => (
                <img
                    key={name}
                    alt={name}
                    src={src}
                    className="rounded-full h-10 w-10 cursor-pointer"
                    onClick={() => onSelect(src)}
                />
            ))}
        </div>
    );
};

export default AvatarSelection;
