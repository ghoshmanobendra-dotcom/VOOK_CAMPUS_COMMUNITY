import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Bell, Megaphone, Heart, UserPlus, MessageCircle, Loader2 } from "lucide-react";
import { usePosts } from "@/context/PostContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";

// --- Types complying with DB Schema ---
interface NotificationData {
    id: string;
    type: 'follow' | 'like' | 'comment' | 'announcement' | 'message' | 'post' | 'mention';
    entity_type: 'post' | 'comment' | 'message' | 'profile' | 'community';
    entity_id: string;
    // content field is legacy/optional, we primarily use data/type for rendering
    content?: string;
    data: any; // JSONB
    is_read: boolean;
    created_at: string;
    actor_id: string;
    actor?: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
    };
}

const Alerts = () => {
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { markNotificationsAsRead } = usePosts();
    // Use sonner toast or ui toast? The file imported 'sonner' toast and 'useToast'. I'll use 'sonner' for simple alerts.
    // Actually the file had both. I'll stick to sonner 'toast' imported above.

    // 1. Fetch Notifications (SAFE)
    // 1. Fetch Notifications (Manual Join)
    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get raw notifications
            const { data: notifsData, error: notifsError } = await supabase
                .from("notifications")
                .select("*")
                .eq("receiver_id", user.id)
                .order("created_at", { ascending: false });

            if (notifsError) throw notifsError;

            // 2. Get unique actor IDs
            const actorIds = [...new Set((notifsData || []).map(n => n.actor_id).filter(Boolean))];

            // 3. Get profiles
            let profilesMap: Record<string, any> = {};
            if (actorIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from("profiles")
                    .select("id, username, full_name, avatar_url")
                    .in("id", actorIds);

                if (profilesError) console.error("Error fetching profiles:", profilesError);

                if (profilesData) {
                    profilesData.forEach(p => {
                        profilesMap[p.id] = p;
                    });
                }
            }

            // 4. Combine
            const combined = (notifsData || []).map(n => ({
                ...n,
                actor: n.actor_id ? profilesMap[n.actor_id] : null
            })) as NotificationData[];

            setNotifications(combined);
        } catch (err: any) {
            console.error("Error fetching notifications:", err);
            setError("Failed to load notifications.");
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Real-time Subscription
    useEffect(() => {
        markNotificationsAsRead();
        fetchNotifications();

        const channel = supabase
            .channel("notifications_updates")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications" },
                (payload: any) => {
                    // Creating a hybrid item to show immediately (data might be incomplete without join)
                    // Best practice: Fetch the single new item to get the actor details
                    fetchNewNotification(payload.new.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchNewNotification = async (id: string) => {
        // Fetch single notification (Manual Join Pattern)
        const { data: notifData, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !notifData) {
            console.error("Error fetching new notification", error);
            return;
        }

        let actor = null;
        if (notifData.actor_id) {
            const { data: actorData } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url")
                .eq("id", notifData.actor_id)
                .single();
            actor = actorData;
        }

        const newItem = {
            ...notifData,
            actor
        } as NotificationData;

        setNotifications(prev => [newItem, ...prev]);
        toast.info("New Notification", { description: getNotificationText(newItem) });
    };

    // 3. Routing Logic (Master Prompt)
    const handleNotificationClick = async (notif: NotificationData) => {
        // Optimistic Read
        if (!notif.is_read) {
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            supabase.from("notifications").update({ is_read: true }).eq("id", notif.id).then(({ error }) => {
                if (error) console.error(error);
            });
        }

        // Helper to safely get data props
        const meta = notif.data || {};

        switch (notif.type) {
            case "like":
            case "comment":
            case "post": // 'post' type often means someone posted in a community or tagged
                // Navigate to specific post
                // Check if we have a postId in data, or fallback to entity_id if entity_type is post
                const postId = meta.post_id || (notif.entity_type === 'post' ? notif.entity_id : null);
                if (postId) {
                    // Using a query param or direct route? 
                    // The user prompt example: navigate(`/post/${notification.entity_id}`);
                    // Since I don't know if /post/:id exists, I will use /?postId= which was in the old code, 
                    // BUT the user prompt said: navigate(`/post/${...}`)
                    // I will try to support the user's intent. If the router doesn't verify, it might 404.
                    // Let's stick to the previous file's likely working pattern OR the master prompt.
                    // OLD: navigate(`/?postId=${notif.entity_id}`);
                    // PROMPT: navigate(`/post/${notification.entity_id}`);
                    // usage of 'navigate' implies react-router.
                    // I'll stick to the Master Prompt recommendation but fallback to old if unsure? 
                    // No, Master Prompt says "switch (notification.type) ... navigate(...)".
                    // Ill use the safest known route. The User mentioned "post/${id}" in the prompt.
                    navigate(`/post/${postId}`);
                }
                break;

            case "announcement":
            case "mention": // Mentions often happen in posts or communities
                // If it's a community announcement
                const commId = meta.community_id || (notif.entity_type === 'community' ? notif.entity_id : null);
                if (commId) navigate(`/community/${commId}`);
                break;

            case "follow":
                navigate(`/profile/${notif.actor_id}`);
                break;

            case "message":
                navigate(`/chats`); // Or /chats?uid=...
                break;

            default:
                // Fallback based on entity_type
                if (notif.entity_type === 'profile') navigate(`/profile/${notif.entity_id}`);
                if (notif.entity_type === 'community') navigate(`/community/${notif.entity_id}`);
                break;
        }
    };

    // 4. Content Generator (UI Helper)
    const getNotificationText = (n: NotificationData) => {
        const name = n.actor?.full_name || "Someone";
        switch (n.type) {
            case "like": return `liked your ${n.entity_type}`;
            case "comment": return `commented on your ${n.entity_type}`;
            case "follow": return `started following you`;
            case "announcement": return `posted an announcement`;
            case "message": return `sent you a message`;
            default: return n.content || "interacted with you";
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'follow': return <UserPlus className="h-4 w-4" />;
            case 'like': return <Heart className="h-4 w-4 fill-current" />;
            case 'comment': return <MessageCircle className="h-4 w-4" />;
            case 'announcement': return <Megaphone className="h-4 w-4" />;
            default: return <Bell className="h-4 w-4" />;
        }
    };

    // 5. Render
    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />

            <main className="mx-auto max-w-xl px-4 py-4">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
                </div>

                <div className="flex flex-col gap-2">
                    {isLoading ? (
                        // Skeleton Loading
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-4 p-4 border rounded-xl">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                        ))
                    ) : error ? (
                        <div className="text-center py-10 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20">
                            <p>{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchNotifications} className="mt-2 border-red-500/30 hover:bg-red-500/10">Retry</Button>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No new notifications yet.</p>
                        </div>
                    ) : (
                        <AnimatePresence initial={false} mode="popLayout">
                            {notifications.map((notification) => (
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
                                        ${!notification.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/40'}
                                    `}>
                                        <div className="shrink-0 relative">
                                            <Avatar className="h-10 w-10 border border-border/50">
                                                <AvatarImage src={notification.actor?.avatar_url || undefined} />
                                                <AvatarFallback>{notification.actor?.full_name?.[0] || "?"}</AvatarFallback>
                                            </Avatar>

                                            {/* Icon Badge */}
                                            <div className={`
                                                absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-background shadow-sm
                                                ${notification.type === 'like' ? 'bg-rose-500 text-white' :
                                                    notification.type === 'follow' ? 'bg-blue-500 text-white' :
                                                        notification.type === 'announcement' ? 'bg-orange-500 text-white' :
                                                            'bg-primary text-primary-foreground'}
                                            `}>
                                                {getIcon(notification.type)}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-sm text-foreground">
                                                    <span className="font-semibold">{notification.actor?.full_name}</span>{" "}
                                                    <span className="text-muted-foreground">{getNotificationText(notification)}</span>
                                                </p>
                                                <span className="text-[10px] text-muted-foreground/70">
                                                    {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>

                                        {!notification.is_read && (
                                            <div className="self-center">
                                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default Alerts;
