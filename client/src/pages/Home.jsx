import { FaEarthAmericas } from "react-icons/fa6";
import { CirclePlus, Radio } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link, useLocation } from 'react-router-dom'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, useStrings } from "@/context/LanguageContext";
import { VetoWordmark } from "@/components/VetoWordmark";
import { ROUTES } from "@/constants/routes";
import './Home.css';

const LANGUAGE_OPTIONS = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "it", label: "Italiano" },
    { value: "pt", label: "Português" },
    { value: "ru", label: "Русский" },
];

const LANGUAGE_LABELS = Object.fromEntries(
    LANGUAGE_OPTIONS.map(({ value, label }) => [value, label])
);

export const Home = () => {
    const location = useLocation();
    const { toast } = useToast();
    const { language, setLanguage } = useLanguage();
    const t = useStrings();
    const reducedMotion = useReducedMotion();
    // All entrance animations on this page share the same delay/duration/ease,
    // just with different initial offsets, so compute the transition once.
    const entranceTransition = {
        delay: reducedMotion ? 0 : 0.3,
        duration: reducedMotion ? 0 : 0.8,
        ease: "easeInOut",
    };

    useEffect(() => {
        if (location.state?.kicked) {
            toast({
                title: t.home.kickedTitle,
                description: t.home.kickedDescription,
                variant: "destructive",
                duration: Infinity,
            });
        } else if (location.state?.hostLeft) {
            toast({
                title: t.home.hostLeftTitle,
                description: t.home.hostLeftDescription,
                variant: "destructive",
                duration: 4000,
            });
        }
    }, []);

    return (
        <div className="flex flex-col h-screen">
            <div className="flex justify-end p-8">
                <motion.div
                    initial={reducedMotion ? false : {opacity: 0.0, x: 40}}
                    whileInView={{opacity: 1, x: 0}}
                    transition={entranceTransition}
                >
                    <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="flex border-0 hover:shadow-md w-fit" aria-label={t.home.languageLabel}>
                            <SelectValue
                                placeholder={
                                    <div
                                        className={"flex items-center justify-center ml-1 mr-1 space-x-2 text-md font-semibold"}>
                                        <FaEarthAmericas/>
                                        <span>{LANGUAGE_LABELS[language]}</span>
                                    </div>
                                }
                            >
                                <div
                                    className={"flex items-center justify-center ml-1 mr-1 space-x-2 text-md font-semibold"}>
                                    <FaEarthAmericas/>
                                    <span>{LANGUAGE_LABELS[language]}</span>
                                </div>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>{t.home.languageLabel}</SelectLabel>
                                {LANGUAGE_OPTIONS.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </motion.div>
            </div>
            <div className="flex-grow mx-auto flex flex-col items-center justify-center">
                <div className="-mt-56">
                    <div className="w-full flex justify-center">
                        <motion.div
                            initial={reducedMotion ? false : {opacity: 0.0, y: 40}}
                            whileInView={{opacity: 1, y: 0}}
                            transition={entranceTransition}
                        >
                            <VetoWordmark size="lg" onDark={false} />
                        </motion.div>
                    </div>
                </div>
                <div className="mx-auto flex items-center justify-center">
                    <div className="flex flex-col space-y-4">
                        <Link to={ROUTES.create}>
                            <motion.div
                                initial={reducedMotion ? false : {opacity: 0.0, y: 40}}
                                whileInView={{opacity: 1, y: 0}}
                                transition={entranceTransition}
                            >
                                <Button className="min-w-40 px-6 text-white">
                                    {t.home.create}
                                    <CirclePlus className="ml-1"/>
                                </Button>
                            </motion.div>
                        </Link>
                        <Link to={ROUTES.join}>
                            <motion.div
                                initial={reducedMotion ? false : {opacity: 0.0, y: 40}}
                                whileInView={{opacity: 1, y: 0}}
                                transition={entranceTransition}
                            >
                                <Button className="min-w-40 px-6 text-white">
                                    {t.home.join}
                                    <Radio className="ml-1.5"/>
                                </Button>
                            </motion.div>
                        </Link>
                    </div>
                </div>
            </div>
            {/*Can just add the css from `Home.css` onto the tags over here*/}
            <div className="fixed inset-0 z-[-1] ">
                <ul className="circles absolute top-0 left-0 w-full h-full overflow-hidden">
                    <li className="circle circle-1"></li>
                    <li className="circle circle-2"></li>
                    <li className="circle circle-3"></li>
                    <li className="circle circle-4"></li>
                    <li className="circle circle-5"></li>
                    <li className="circle circle-6"></li>
                    <li className="circle circle-7"></li>
                    <li className="circle circle-8"></li>
                    <li className="circle circle-9"></li>
                    <li className="circle circle-10"></li>
                </ul>
            </div>

        </div>
    )
}
