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

    useEffect(() => {
        if (!communityId) return;
        checkUnread();

        const channel = supabase
            .channel(`announcements_btn:${communityId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'announcements',
                    filter: `community_id=eq.${communityId}`
                },
                () => {
                    checkUnread();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [communityId]);

    const checkUnread = async () => {
        try {
            // Get latest announcement
            const { data: latest } = await supabase
                .from('announcements')
                .select('created_at')
                .eq('community_id', communityId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!latest) return;

            // Check against local storage last read
            const lastRead = localStorage.getItem(`announcements_read_${communityId}`);
            if (!lastRead || new Date(latest.created_at).getTime() > new Date(lastRead).getTime()) {
                setUnreadCount(1); // Simple bool check for now, or count real unread if needed
            } else {
                setUnreadCount(0);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Button
            size="icon"
            className="h-12 w-12 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-xl hover:scale-110 transition-all duration-300 relative z-50 border-2 border-white/20"
            onClick={() => onToggle(!isOpen)}
        >
            <Mic className={`h-6 w-6 ${isOpen ? 'animate-pulse text-red-100' : ''}`} />

            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </span>
            )}
        </Button>
    );
};

export default AnnouncementButton;
