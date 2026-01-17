import { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Facebook, Linkedin, Twitter, Link as LinkIcon, MessageCircle, Send, Users
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/context/PostContext";

interface ShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    post: {
        id: string;
        authorName: string;
        content: string;
    }
}

const ShareModal = ({ open, onOpenChange, post }: ShareModalProps) => {
    const { currentUser } = usePosts();
    const [loading, setLoading] = useState(false);

    // Generate Share URL
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    const shareText = `Check out this post by ${post.authorName} on Vook!`;

    const handleExternalShare = async (platform: string) => {
        // Record share in DB
        if (currentUser?.id) {
            await supabase.from('shares').insert({
                post_id: post.id,
                user_id: currentUser.id,
                share_type: platform
            });
        }

        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedText = encodeURIComponent(shareText);

        let url = '';
        switch (platform) {
            case 'whatsapp':
                url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
                break;
            case 'copy':
                url = ''; // Logic handled below
                break;
        }

        if (platform === 'copy') {
            navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard!");
            onOpenChange(false);
        } else if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Post</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 gap-4">
                        <Button variant="outline" className="flex flex-col h-24 gap-2 border-primary/20 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleExternalShare('whatsapp')}>
                            <MessageCircle className="h-8 w-8 text-green-500" />
                            <span className="text-xs">WhatsApp</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-24 gap-2 border-primary/20 hover:bg-blue-600/10 hover:text-blue-600" onClick={() => handleExternalShare('linkedin')}>
                            <Linkedin className="h-8 w-8 text-blue-600" />
                            <span className="text-xs">LinkedIn</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-24 gap-2 border-primary/20 hover:bg-blue-400/10 hover:text-blue-400" onClick={() => handleExternalShare('twitter')}>
                            <Twitter className="h-8 w-8 text-blue-400" />
                            <span className="text-xs">Twitter</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-24 gap-2 border-primary/20 hover:bg-blue-700/10 hover:text-blue-700" onClick={() => handleExternalShare('facebook')}>
                            <Facebook className="h-8 w-8 text-blue-700" />
                            <span className="text-xs">Facebook</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-24 gap-2 border-primary/20" onClick={() => handleExternalShare('copy')}>
                            <LinkIcon className="h-8 w-8" />
                            <span className="text-xs">Copy Link</span>
                        </Button>
                        {/* Placeholder for internal share */}
                        <Button variant="outline" className="flex flex-col h-24 gap-2 border-primary/20 bg-muted/50" disabled>
                            <Send className="h-8 w-8 opacity-50" />
                            <span className="text-xs">Chat (Soon)</span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShareModal;
