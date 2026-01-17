import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, MessageCircle, UserPlus, Bell, Check, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { usePosts } from "@/context/PostContext";

interface Notification {
    id: string;
    type: 'like' | 'comment' | 'reply' | 'follow' | 'community_invite' | 'announcement';
    entity_type: string;
    entity_id: string;
    data: any;
    is_read: boolean;
    created_at: string;
    actor: {
        id: string;
        full_name: string;
        username: string;
        avatar_url: string;
    };
}

const Notifications = () => {
    const navigate = useNavigate();
    const { currentUser, markNotificationsAsRead } = usePosts();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();

        // Subscribe to real-time notifications
        const channel = supabase
            .channel('notifications_page')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `recipient_id=eq.${currentUser?.id}`
            }, (payload) => {
                // Fetch the full notification with actor details 
                // (Payload only has raw ID, we need the join)
                fetchNewNotification(payload.new.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]);

    const fetchNotifications = async () => {
        if (!currentUser?.id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    actor:actor_id (id, full_name, username, avatar_url)
                `)
                .eq('recipient_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchNewNotification = async (id: string) => {
        const { data } = await supabase
            .from('notifications')
            .select(`
                *,
                actor:actor_id (id, full_name, username, avatar_url)
            `)
            .eq('id', id)
            .single();

        if (data) {
            setNotifications(prev => [data, ...prev]);
            toast.info("New notification received");
        }
    };

    const handleMarkAllRead = async () => {
        await supabase.rpc('mark_all_notifications_read');
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        markNotificationsAsRead(); // Update context badge
        toast.success("Marked all as read");
    };

    const handleClick = async (notif: Notification) => {
        // Mark as read
        if (!notif.is_read) {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            markNotificationsAsRead();
        }

        // Navigate
        if (notif.type === 'follow') {
            navigate(`/profile/${notif.actor.id}`);
        } else if (notif.entity_type === 'post' || notif.entity_type === 'comment') {
            // In a real app, you'd navigate to the post detail
            // navigate(`/post/${notif.entity_id}`);
            toast.info("Navigation to post detail not implemented yet");
            // Or maybe open a modal? Post detail page is needed. 
            // We have Community detail but maybe not single post detail page yet?
            // Let's assume there isn't one and just show a toast for now or navigate to Feed?
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'like': return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
            case 'comment': return <MessageCircle className="h-4 w-4 text-blue-500 fill-blue-500" />;
            case 'reply': return <MessageCircle className="h-4 w-4 text-blue-500" />;
            case 'follow': return <UserPlus className="h-4 w-4 text-purple-500" />;
            case 'community_invite': return <Users className="h-4 w-4 text-green-500" />;
            default: return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    const getMessage = (notif: Notification) => {
        const actorName = notif.actor?.full_name || 'Someone';
        switch (notif.type) {
            case 'like': return <span><strong>{actorName}</strong> liked your post.</span>;
            case 'comment': return <span><strong>{actorName}</strong> commented on your post.</span>;
            case 'reply': return <span><strong>{actorName}</strong> replied to your comment.</span>;
            case 'follow': return <span><strong>{actorName}</strong> started following you.</span>;
            case 'community_invite': return <span><strong>{actorName}</strong> invited you to a community.</span>;
            default: return <span>New notification from <strong>{actorName}</strong>.</span>;
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            <BottomNav />

            <div className="flex-1 flex flex-col md:pl-64 w-full max-w-2xl mx-auto border-x border-border/50">
                <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md p-4 border-b border-border flex justify-between items-center">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        Notifications
                        {notifications.some(n => !n.is_read) && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                    </h1>
                    <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-muted-foreground hover:text-primary">
                        <Check className="h-4 w-4 mr-2" /> Mark all read
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center gap-4 text-muted-foreground">
                            <Bell className="h-12 w-12 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleClick(notif)}
                                    className={`
                                        p-4 hover:bg-muted/50 cursor-pointer transition-colors flex gap-4
                                        ${!notif.is_read ? 'bg-primary/5' : ''}
                                    `}
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border border-border">
                                            <AvatarImage src={notif.actor?.avatar_url} />
                                            <AvatarFallback>{notif.actor?.full_name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border shadow-sm">
                                            {getIcon(notif.type)}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm">
                                            {getMessage(notif)}
                                        </p>
                                        {notif.data?.snippet && (
                                            <p className="text-xs text-muted-foreground line-clamp-1 border-l-2 border-primary/20 pl-2">
                                                "{notif.data.snippet}"
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                        </p>
                                    </div>

                                    {!notif.is_read && (
                                        <div className="self-center">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Right sidebar filler */}
            <div className="hidden lg:block w-80 border-l border-border bg-card/50">
                {/* Suggestions or other content */}
            </div>
        </div>
    );
};

export default Notifications;
