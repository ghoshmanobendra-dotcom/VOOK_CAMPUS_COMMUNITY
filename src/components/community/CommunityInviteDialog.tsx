import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CommunityInviteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    community: any;
}

const CommunityInviteDialog = ({ isOpen, onClose, community }: CommunityInviteDialogProps) => {
    const [copied, setCopied] = useState(false);

    // Generate a nice link (assuming routing is /community/:id or similar)
    const inviteLink = `${window.location.origin}/community/${community.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Join ${community.name} on Vook`,
                    text: `Check out the ${community.name} community!`,
                    url: inviteLink,
                });
            } catch (err) {
                // Ignore abort errors
            }
        } else {
            handleCopy();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite to {community.name}</DialogTitle>
                    <DialogDescription>
                        Share this link with others to invite them to the community.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 mt-2">
                    <div className="grid flex-1 gap-2">
                        <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-md border text-sm text-muted-foreground break-all">
                            <Share2 className="w-4 h-4 shrink-0" />
                            <span className="line-clamp-1">{inviteLink}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="secondary" className="flex-1" onClick={handleNativeShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                    </Button>
                    <Button type="button" className="flex-1" onClick={handleCopy}>
                        {copied ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Link
                            </>
                        )}
                    </Button>
                </div>

                {/* Future: User search and direct invite list could go here */}
                <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-center text-muted-foreground">
                        Direct user invites coming soon.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CommunityInviteDialog;
