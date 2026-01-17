import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, MessageSquare } from "lucide-react";
import CommunityFeed from "./CommunityFeed";

interface MicFeedPanelProps {
    communityId: string;
    communityName: string;
    isOpen: boolean;
    onClose: () => void;
}

const MicFeedPanel = ({ communityId, communityName, isOpen, onClose }: MicFeedPanelProps) => {
    return (
        <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/50" side="right">

                {/* Header */}
                <SheetHeader className="p-6 border-b shrink-0 bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle>Community Discussion</SheetTitle>
                            <SheetDescription>Real-time posts and announcements</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {/* Content */}
                <ScrollArea className="flex-1 bg-muted/5">
                    <div className="p-6">
                        <CommunityFeed
                            communityId={communityId}
                            communityName={communityName}
                            filter="all" // Fetch ALL posts (announcements + regular)
                        />
                    </div>
                </ScrollArea>

            </SheetContent>
        </Sheet>
    );
};

export default MicFeedPanel;
