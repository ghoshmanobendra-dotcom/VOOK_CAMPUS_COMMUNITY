import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone } from "lucide-react";
import CommunityFeed from "./CommunityFeed";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommunityAnnouncementsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: string;
    communityName: string;
}

const CommunityAnnouncementsDialog = ({ isOpen, onOpenChange, communityId, communityName }: CommunityAnnouncementsDialogProps) => {

    useEffect(() => {
        if (isOpen && communityId) {
            // Simply mark as seen when opened
            localStorage.setItem(`last_seen_announcements_${communityId}`, new Date().toISOString());
        }
    }, [isOpen, communityId]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0 outline-none border-border/50 bg-background/95 backdrop-blur-xl">
                <DialogHeader className="p-6 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Megaphone className="w-5 h-5 text-primary" />
                        Announcements
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 bg-muted/10 p-0">
                    <div className="p-6">
                        <CommunityFeed
                            communityId={communityId}
                            communityName={communityName}
                            filter="official"
                        />
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default CommunityAnnouncementsDialog;
