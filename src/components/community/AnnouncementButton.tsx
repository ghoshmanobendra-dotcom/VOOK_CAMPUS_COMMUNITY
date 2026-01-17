import { useState, useEffect } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AnnouncementButtonProps {
    communityId: string;
    onToggle: (isOpen: boolean) => void;
    isOpen?: boolean;
}

const AnnouncementButton = ({ communityId, onToggle, isOpen }: AnnouncementButtonProps) => {
    const [unreadCount, setUnreadCount] = useState(0);

    // Simplified unread check for now - can be expanded to check actual unread posts
    // For now it pulses/glows as requested in idle state

    return (
        <Button
            size="icon"
            variant="ghost"
            className={`
                relative transition-all duration-300
                ${isOpen ? 'bg-primary/20 scale-110' : 'hover:scale-110 hover:bg-primary/10'}
                ${!isOpen && 'animate-pulse-slow'} 
            `}
            onClick={() => onToggle(!isOpen)}
        >
            <Mic className={`h-5 w-5 ${isOpen ? 'text-primary' : 'text-foreground/80'}`} />

            {/* Optional: Glow effect container */}
            <span className={`absolute inset-0 rounded-full bg-primary/20 blur-md transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
        </Button>
    );
};

export default AnnouncementButton;
