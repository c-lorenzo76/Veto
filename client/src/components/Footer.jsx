import { Copyright } from "lucide-react";

export const Footer = () => {
    return (
        <div className={"border-t w-full flex justify-center items-center"}>
            <span className={"flex pt-2 justify-center items-center"}>
                <Copyright size={12} className={"mr-1"} />
                Veto
            </span>
        </div>
    )
}