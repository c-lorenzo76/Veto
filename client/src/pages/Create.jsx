// Create.jsx
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { useState, useEffect } from "react";
import { ChevronRight, User, Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocket } from "@/SocketContext"
import AvatarSelection from "@/components/AvatarSelection";
import { useStrings } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";

export const Create = () => {

    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const navigate = useNavigate();
    const { socket } = useSocket();
    const t = useStrings();
    const { toast } = useToast();


    useEffect(() => {
        if (!socket) return;
        const handleLobbyCreated = (code) => navigate(ROUTES.room(code));
        socket.on('lobbyCreated', handleLobbyCreated);
        return () => socket.off('lobbyCreated', handleLobbyCreated);
    }, [socket, navigate]);

    const avatarSelect = (avatar) => {
        setSelectedAvatar(avatar);
    };

    const showLocationError = (description) => {
        toast({
            title: t.create.locationErrorTitle,
            description,
            variant: "destructive",
            duration: 4000,
        });
        setIsCreating(false);
    };

    const handleLocationError = (error) => {
        if (error.code === error.PERMISSION_DENIED) {
            showLocationError(t.create.locationDenied);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            showLocationError(t.create.locationUnavailable);
        } else if (error.code === error.TIMEOUT) {
            showLocationError(t.create.locationTimeout);
        }
    };

    // asks for location
    const handleLocation = () => {
        if (!name.trim()) {
            toast({
                title: t.create.nameRequiredTitle,
                description: t.create.nameRequiredDescription,
                variant: "destructive",
                duration: 4000,
            });
            return;
        }

        if (!selectedAvatar) {
            toast({
                title: t.create.avatarRequiredTitle,
                description: t.create.avatarRequiredDescription,
                variant: "destructive",
                duration: 4000,
            });
            return;
        }

        if (isCreating) return;
        setIsCreating(true);

        if (!navigator.geolocation) {
            showLocationError(t.create.geolocationNotSupported);
        } else {
            navigator.geolocation.getCurrentPosition(createLobby, handleLocationError);
        }
    };


    function createLobby(position) {

        const coords = `${position.coords.latitude},${position.coords.longitude}`;

        if (socket) {
            socket.auth = {token: name, avatar: selectedAvatar};
            socket.connect();

            socket.emit("createLobby", {coords});
        } else {
            console.error('Socket not initialized...')
            setIsCreating(false);
        }
    }

    return (
        <div className="flex flex-col justify-center min-h-screen items-center bg-surface-muted">
            <motion.div
                initial={{opacity: 0.0, x: -40}}
                whileInView={{opacity: 1, x: 0}}
                transition={{
                    delay: 0.3,
                    duration: 0.8,
                    ease: "easeInOut",
                }}
            >
                <Card className="w-full max-w-sm bg-surface">
                    <CardHeader>
                        <CardTitle className="text-5xl flex justify-center">
                            {t.create.title}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {t.create.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2 justify-center items-center">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <motion.div
                                        whileHover={{scale: 1.05}}
                                        transition={{type: "spring", stiffness: 300, damping: 15}}
                                        className="flex items-center justify-center"
                                    >
                                        <div className="flex items-center justify-center">
                                            <Button
                                                className="p-0 w-20 h-20 border bg-transparent hover:bg-muted-foreground/50 rounded-full">
                                                {selectedAvatar ? (
                                                    <img src={selectedAvatar}
                                                         alt="Selected avatar"
                                                         className="w-20 h-20 object-cover rounded-full border-blue-600"/>
                                                ) : (
                                                    <div className="flex items-center justify-center">
                                                        <Plus size={15} className="stroke-black"/>
                                                        <User size={36} className="stroke-black"/>
                                                    </div>
                                                )}
                                            </Button>
                                        </div>
                                    </motion.div>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>
                                            {t.create.selectAvatarTitle}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {t.create.selectAvatarDescription}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogClose>
                                        <AvatarSelection onSelect={avatarSelect} />
                                    </DialogClose>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <CardDescription className="text-center">
                            {t.create.avatarPrompt}
                        </CardDescription>
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t.create.nameLabel}</Label>
                            <Input id="name" type="text" placeholder={t.create.namePlaceholder} onChange={(e) => setName(e.target.value)} required />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleLocation} disabled={isCreating}>
                            {isCreating ? (
                                <Loader2 className="animate-spin"/>
                            ) : (
                                <ChevronRight/>
                            )}
                            {t.create.createButton}
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}