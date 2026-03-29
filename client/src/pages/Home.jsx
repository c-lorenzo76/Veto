import { FaEarthAmericas } from "react-icons/fa6";
import { CirclePlus, Radio } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { motion } from "framer-motion";
import './Home.css';

export const Home = () => {
    return (
        <div className="flex flex-col h-screen">
            <div className="flex justify-end p-8">
                <motion.div
                    initial={{opacity: 0.0, x: 40}}
                    whileInView={{opacity: 1, x: 0}}
                    transition={{
                        delay: 0.3,
                        duration: 0.8,
                        ease: "easeInOut",
                    }}
                >
                    <Select>
                        <SelectTrigger className={"flex border-0 hover:border-0 hover:shadow-md w-fit "}>
                            <SelectValue
                                placeholder={
                                    <div
                                        className={"flex items-center justify-center ml-1 mr-1 space-x-2 text-xl font-bold"}>
                                        <FaEarthAmericas/>
                                        <span>EN</span>
                                    </div>
                                }
                            >
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>English</SelectLabel>
                                <SelectItem value="Spanish">Spanish</SelectItem>
                                <SelectItem value="French">French</SelectItem>
                                <SelectItem value="Italian">Italian</SelectItem>
                                <SelectItem value="Portuguese">Portuguese</SelectItem>
                                <SelectItem value="Russian">Russian</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </motion.div>
            </div>
            <div className="flex-grow mx-auto flex flex-col items-center justify-center">
                <div className="-mt-56">
                    <div className="w-full flex justify-center">
                        <motion.div
                            initial={{opacity: 0.0, y: 40}}
                            whileInView={{opacity: 1, y: 0}}
                            transition={{
                                delay: 0.3,
                                duration: 0.8,
                                ease: "easeInOut",
                            }}
                        >
                            <img src="/veto-logo.png" alt="Veto" className="w-64" />
                        </motion.div>
                    </div>
                </div>
                <div className="mx-auto flex items-center justify-center">
                    <div className="flex flex-col space-y-4">
                        <Link to={"/Create"}>
                            <motion.div
                                initial={{opacity: 0.0, y: 40}}
                                whileInView={{opacity: 1, y: 0}}
                                transition={{
                                    delay: 0.3,
                                    duration: 0.8,
                                    ease: "easeInOut",
                                }}
                            >
                                <Button className="w-40 text-white">
                                    Create
                                    <CirclePlus className="ml-1"/>
                                </Button>
                            </motion.div>
                        </Link>
                        <Link to={"/Join"}>
                            <motion.div
                                initial={{opacity: 0.0, y: 40}}
                                whileInView={{opacity: 1, y: 0}}
                                transition={{
                                    delay: 0.3,
                                    duration: 0.8,
                                    ease: "easeInOut",
                                }}
                            >
                                <Button className="w-40 text-white">
                                    Join
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
