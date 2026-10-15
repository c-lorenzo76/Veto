import { Copyright } from "lucide-react";
import { cn } from "@/lib/utils";

export const Footer = ({ className = "" }) => {
    return (
        <footer className={cn("border-t border-surface-border w-full flex justify-center items-center py-5", className)}>
            <span className={"flex justify-center items-center text-sm text-muted-foreground"}>
                <Copyright size={12} className={"mr-1"} />
                Veto
            </span>
        </footer>
    )
}
