import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Bell, Megaphone, BellRing, Heart, UserPlus, MessageCircle, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import TiltCard from "@/components/TiltCard";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { usePosts } from "@/context/PostContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NotificationItem {
    id: string;
    type: 'follow' | 'like' | 'comment' | 'announcement' | 'message' | 'post';
    entity_type: 'post' | 'comment' | 'message' | 'profile' | 'community';
    entity_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
    sender?: {
        full_name: string;
        username: string;
        avatar_url?: string;
    };
}

const Alerts = () => {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { markNotificationsAsRead } = usePosts();
    const navigate = useNavigate();

    useEffect(() => {
        if ("Notification" in window) {
            setPermission(Notification.permission);
        }
        fetchNotifications();
        markNotificationsAsRead();

        // Real-time Subscription
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    // Fetch full details including sender
                    fetchSingleNotificationDetails(payload.new.id);

                    // Browser Notification
                    if (Notification.permission === "granted") {
                        new Notification("New Notification", {
                            body: payload.new.content || "Check your alerts",
                            icon: "/icon.png"
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchSingleNotificationDetails = async (id: string) => {
        const { data } = await supabase
            .from('notifications')
            .select('*, sender:sender_id(full_name, username, avatar_url)')
            .eq('id', id)
            .single();

        if (data) {
            setNotifications(prev => [data, ...prev]);
        }
    };

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*, sender:sender_id(full_name, username, avatar_url)')
                .eq('recipient_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);

            // Mark all as read after fetching (optional choice, or do it on interaction)
            // Here we just fetch. 'markNotificationsAsRead' in context resets count.
            // We usually want to mark db as read when "seen".
            if (data && data.length > 0) {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('recipient_id', user.id)
                    .eq('is_read', false);
            }

        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotificationClick = async (notif: NotificationItem) => {
        // Mark as read immediately in UI
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));

        // Navigation Logic
        switch (notif.entity_type) {
            case 'post':
                // Assuming we have a route /post/:id or scroll to it
                // If it's a modal, we might need context logic. For now, assuming page.
                // Or navigation to home with hash? Let's assume Profile or Home.
                // Ideally: navigate(`/post/${notif.entity_id}`);
                // If standard feed: 
                navigate(`/?postId=${notif.entity_id}`); // Example query param handling, or dedicated route
                break;
            case 'profile':
                navigate(`/profile/${notif.entity_id}`);
                break;
            case 'message':
                navigate(`/chats?chatId=${notif.entity_id}`); // Logic to open specific chat
                break;
            case 'community':
                navigate(`/community/${notif.entity_id}`);
                break;
            default:
                break;
        }

        // DB update (background)
        if (!notif.is_read) {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
        }
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            toast.error("This browser does not support desktop notifications");
            return;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === "granted") {
                toast.success("Notifications enabled!");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        return `${Math.floor(diffInSeconds / 86400)}d`;
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'follow': return <UserPlus className="h-4 w-4" />;
            case 'like': return <Heart className="h-4 w-4 fill-current" />;
            case 'comment': return <MessageCircle className="h-4 w-4" />;
            case 'announcement': return <Megaphone className="h-4 w-4" />;
            case 'message': return <MessageCircle className="h-4 w-4" />;
            default: return <Bell className="h-4 w-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />

            <main className="mx-auto max-w-xl px-4 py-4">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
                </div>

                <div className="flex flex-col gap-2">
                    {isLoading ? (
                        <div className="text-center py-10 text-muted-foreground animate-pulse">Loading alerts...</div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No new notifications</p>
                            <Button variant="link" onClick={requestNotificationPermission}>Enable Push Notifications</Button>
                        </div>
                    ) : (
                        <AnimatePresence initial={false} mode="popLayout">
                            {notifications.map((notification) => {
                                const isAnnouncement = notification.type === "announcement";
                                return (
                                    <motion.div
                                        key={notification.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => handleNotificationClick(notification)}
                                        className="cursor-pointer"
                                    >
                                        <div className={`
                                            relative flex gap-3 p-4 rounded-xl border transition-all hover:bg-muted/50
                                            ${!notification.is_read ? 'bg-muted/30 border-primary/20' : 'bg-card border-border/40'}
                                        `}>
                                            <div className="shrink-0">
                                                <Avatar className="h-10 w-10 border border-border/50">
                                                    <AvatarImage src={notification.sender?.avatar_url} />
                                                    <AvatarFallback>{notification.sender?.full_name?.[0] || "?"}</AvatarFallback>
                                                </Avatar>
                                                <div className={`
                                                    absolute bottom-3 left-10 -ml-2 flex h-5 w-5 items-center justify-center rounded-full border border-background
                                                    ${notification.type === 'like' ? 'bg-red-500 text-white' :
                                                        notification.type === 'follow' ? 'bg-blue-500 text-white' :
                                                            'bg-primary text-primary-foreground'}
                                                `}>
                                                    {getIcon(notification.type)}
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm">
                                                        <span className="font-semibold text-foreground">{notification.sender?.full_name}</span>
                                                        <span className="text-muted-foreground ml-1">{notification.content.replace(notification.sender?.full_name || '', '')}</span>
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {!notification.is_read && (
                                                <div className="self-center">
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default Alerts;
