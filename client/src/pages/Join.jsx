import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog.jsx";
import { Plus, User, Merge } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import AvatarSelection from "@/components/AvatarSelection";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES, ROOM_PARAM } from "@/constants/routes";
import { useSocket } from "@/SocketContext";
import { useEffect } from "react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { useStrings } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";


export const Join = () => {
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [name, setName] = useState('');
    const [searchParams] = useSearchParams();
    const [pin, setPin] = useState(() => (searchParams.get(ROOM_PARAM) || '').toUpperCase());
    const navigate = useNavigate();
    const { socket, connectSocket } = useSocket();
    const t = useStrings();
    const { toast } = useToast();


    const avatarSelect = (avatar) => {
        setSelectedAvatar(avatar);
    };

    useEffect(() => {
        if (!socket) return;
        const handleLobbyJoined = () => {
            navigate(ROUTES.room(pin));
        };
        const handleError = () => {
            toast({
                title: t.join.errorTitle,
                description: t.join.errorDescription,
                variant: "destructive",
                duration: 4000,
            });
        };
        socket.on('lobbyJoined', handleLobbyJoined);
        socket.on('Error', handleError);
        return () => {
            socket.off('lobbyJoined', handleLobbyJoined);
            socket.off('Error', handleError);
        }
    }, [socket, pin, navigate, toast, t]);

    const handleJoin = () => {
        if (!name.trim()) {
            toast({
                title: t.join.nameRequiredTitle,
                description: t.join.nameRequiredDescription,
                variant: "destructive",
                duration: 4000,
            });
            return;
        }

        if (!selectedAvatar) {
            toast({
                title: t.join.avatarRequiredTitle,
                description: t.join.avatarRequiredDescription,
                variant: "destructive",
                duration: 4000,
            });
            return;
        }

        if (pin) {
            connectSocket(name, selectedAvatar);
            socket.emit("joinLobby", { lobbyCode: pin });
        }
    }

    return (
        <div className="flex flex-col justify-center min-h-screen items-center bg-surface-muted">
            <motion.div
                initial={{ opacity: 0.0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{
                    delay: 0.3,
                    duration: 0.8,
                    ease: "easeInOut",
                }}
            >
                <Card className="w-full max-w-sm bg-surface">
                    <CardHeader>
                        <CardTitle className="text-5xl flex justify-center">
                            {t.join.title}
                        </CardTitle>
                        <CardDescription className="text-center text-md">
                            {t.join.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className={"grid gap-2 justify-center items-center"}>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                        className="flex items-center justify-center"
                                    >
                                        <div className={"flex items-center justify-center "}>
                                            <Button
                                                className={"p-0 w-20 h-20 border bg-transparent hover:bg-muted-foreground/50 rounded-full"}>
                                                {selectedAvatar ? (
                                                    <img src={selectedAvatar}
                                                        alt={"Selected avatar"}
                                                        className={"w-20 h-20 object-cover rounded-full border-blue-600"} />
                                                ) : (
                                                    <div className={"flex items-center justify-center"}>
                                                        <Plus size={15} className={"stroke-black"} />
                                                        <User size={36} className={"stroke-black"} />
                                                    </div>
                                                )}
                                            </Button>
                                        </div>
                                    </motion.div>
                                </DialogTrigger>
                                <DialogContent className={"sm:max-w-[425px]"}>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {t.join.selectAvatarTitle}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {t.join.selectAvatarDescription}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogClose>
                                        <AvatarSelection onSelect={avatarSelect} />
                                    </DialogClose>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <CardDescription className={"text-center"}>
                            {t.join.avatarPrompt}
                        </CardDescription>
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t.join.nameLabel}</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder={t.join.namePlaceholder}
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pin">{t.join.pinLabel}</Label>
                            <div className="flex items-center justify-center mx-auto ">
                                <InputOTP
                                    id="pin"
                                    maxLength={6}
                                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                                    inputMode="text"
                                    value={pin}
                                    onChange={(e) => setPin(e.toUpperCase())}
                                >
                                    <InputOTPGroup className="bg-white">
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                    </InputOTPGroup>
                                    <InputOTPSeparator />
                                    <InputOTPGroup className="bg-white">
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleJoin}>
                            <Merge className={"mr-0.5"} />
                            {t.join.joinButton}
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};