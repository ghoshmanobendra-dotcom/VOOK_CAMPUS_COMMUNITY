import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AnnouncementButtonProps {
    communityId: string;
    onToggle: (isOpen: boolean) => void;
    isOpen?: boolean;
}

const AnnouncementButton = ({ communityId, onToggle, isOpen }: AnnouncementButtonProps) => {

    return (
        <div className="relative group flex items-center justify-center">
            {/* Outer Ripple Effects (suggesting broadcast) */}
            {!isOpen && (
                <>
                    <div className="absolute h-full w-full rounded-full bg-primary/20 animate-ping [animation-duration:3s] opacity-20" />
                    <div className="absolute h-full w-full rounded-full bg-indigo-500/10 animate-ping [animation-duration:2s] [animation-delay:0.5s] opacity-30" />
                </>
            )}

            {/* Glowing Backdrop */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-lg transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}`} />

            <Button
                size="icon"
                variant="ghost"
                className={`
                    relative z-10 h-10 w-10 rounded-full transition-all duration-500 ease-out
                    border border-primary/10 bg-background/80 backdrop-blur-md shadow-sm
                    hover:border-primary/30 hover:bg-background hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]
                    ${isOpen ? 'bg-primary/5 border-primary/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : ''}
                `}
                onClick={() => onToggle(!isOpen)}
            >
                <Megaphone
                    className={`
                        h-5 w-5 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                        ${isOpen
                            ? 'text-primary scale-110 -rotate-12 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                            : 'text-muted-foreground group-hover:text-primary group-hover:scale-110 group-hover:rotate-12'
                        }
                    `}
                    strokeWidth={isOpen ? 2.5 : 2}
                />
            </Button>
        </div>
    );
};

export default AnnouncementButton;
