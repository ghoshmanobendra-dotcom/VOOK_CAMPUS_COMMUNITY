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
    const [view, setView] = useState<'options' | 'chat-select'>('options');
    const [searchQuery, setSearchQuery] = useState("");
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [sending, setSending] = useState(false);

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
            case 'chat':
                setView('chat-select');
                fetchRecentChats();
                return;
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

    const fetchRecentChats = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            // Get my chats
            const { data: participations } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', currentUser.id);

            const chatIds = participations?.map(p => p.chat_id) || [];

            if (chatIds.length > 0) {
                // Get chat details (simple version)
                const { data: chats } = await supabase
                    .from('chats')
                    .select('*, participants:chat_participants(user_id, profiles(full_name, avatar_url))')
                    .in('id', chatIds)
                    .eq('type', 'private'); // Prioritize private chats for simpler display

                // Format for display
                const formatted = chats?.map(chat => {
                    const partner = chat.participants.find((p: any) => p.user_id !== currentUser.id)?.profiles;
                    return {
                        id: chat.id,
                        name: partner?.full_name || "Unknown",
                        avatar: partner?.avatar_url,
                        type: 'existing'
                    };
                }).filter(c => c.name !== "Unknown") || [];

                setRecentChats(formatted);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim() || !currentUser?.id) {
            setFoundUsers([]);
            return;
        }

        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .ilike('full_name', `%${query}%`)
            .neq('id', currentUser.id)
            .limit(5);

        setFoundUsers(data || []);
    };

    const sendToChat = async (target: any) => {
        if (!currentUser?.id || sending) return;
        setSending(true);

        try {
            let chatId = target.id;

            // If it's a user (from search), we need to find the chat_id between us
            if (target.type !== 'existing') {
                const targetUserId = target.id;

                // 1. Get my chats
                const { data: myParticipations } = await supabase
                    .from('chat_participants')
                    .select('chat_id')
                    .eq('user_id', currentUser.id);

                const myChatIds = myParticipations?.map(c => c.chat_id) || [];

                let foundChatId = null;

                if (myChatIds.length > 0) {
                    // 2. See if target is in any of my private chats
                    // We need to check if the chat is private too, but usually checking participants pair is enough for 1:1
                    const { data: existingPart } = await supabase
                        .from('chat_participants')
                        .select('chat_id')
                        .in('chat_id', myChatIds)
                        .eq('user_id', targetUserId)
                        .single();

                    if (existingPart) foundChatId = existingPart.chat_id;
                }

                if (!foundChatId) {
                    // Create new private chat
                    const { data: newChat } = await supabase
                        .from('chats')
                        .insert({ type: 'private' })
                        .select()
                        .single();

                    if (!newChat) throw new Error("Failed to create chat");

                    await supabase.from('chat_participants').insert([
                        { chat_id: newChat.id, user_id: currentUser.id },
                        { chat_id: newChat.id, user_id: targetUserId }
                    ]);
                    foundChatId = newChat.id;
                }
                chatId = foundChatId;
            }

            // Send Message
            const content = `Check out this post by ${post.authorName}: ${shareUrl}`;

            await supabase.from('messages').insert({
                chat_id: chatId,
                sender_id: currentUser.id,
                content: content
            });

            toast.success("Sent to " + target.name);
            onOpenChange(false);

            // Also log share
            await supabase.from('shares').insert({
                post_id: post.id,
                user_id: currentUser.id,
                share_type: 'chat'
            });

        } catch (e) {
            console.error(e);
            toast.error("Failed to send");
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) setView('options'); // Reset view on close
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-md bg-card">
                <DialogHeader>
                    <DialogTitle>{view === 'options' ? 'Share Post' : 'Send to...'}</DialogTitle>
                </DialogHeader>

                {view === 'options' ? (
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

                            <Button
                                variant="outline"
                                className="flex flex-col h-24 gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleExternalShare('chat')}
                            >
                                <Send className="h-8 w-8" />
                                <span className="text-xs">Chat</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 h-[300px]">
                        <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Search people..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {searchQuery.trim() ? (
                                foundUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                                        onClick={() => sendToChat(user)}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                                            {user.avatar_url && <img src={user.avatar_url} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{user.full_name}</p>
                                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                                        </div>
                                        <Send className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                ))
                            ) : (
                                <>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Recent Chats</p>
                                    {recentChats.map(chat => (
                                        <div
                                            key={chat.id}
                                            className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                                            onClick={() => sendToChat(chat)}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                                                {chat.avatar && <img src={chat.avatar} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{chat.name}</p>
                                                <p className="text-xs text-muted-foreground">Existing Conversation</p>
                                            </div>
                                            <Send className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    ))}
                                    {recentChats.length === 0 && (
                                        <p className="text-sm text-center text-muted-foreground mt-4">No recent chats.</p>
                                    )}
                                </>
                            )}
                        </div>
                        <Button variant="ghost" className="w-full" onClick={() => setView('options')}>
                            Back
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ShareModal;
