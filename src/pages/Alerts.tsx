import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Bell, Megaphone, BellRing, Heart, UserPlus, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import TiltCard from "@/components/TiltCard";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { usePosts } from "@/context/PostContext";

interface NotificationItem {
    id: string;
    type: 'follow' | 'like' | 'comment' | 'announcement' | 'message';
    content: string;
    is_read: boolean;
    created_at: string;
    sender?: {
        full_name: string;
        username: string;
        avatar_url?: string;
    };
    reference_id?: string;
}

const Alerts = () => {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { markNotificationsAsRead } = usePosts();

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
                    const newNotif = payload.new as NotificationItem;

                    // Since we need sender details, we might need to fetch them or just show a generic alert first
                    // For best UX, let's fetch the sender details immediately
                    fetchSingleNotificationDetails(newNotif.id);

                    // Browser Notification
                    if (Notification.permission === "granted") {
                        new Notification("New Alert", {
                            body: newNotif.content || "You have a new notification",
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
        const { data, error } = await supabase
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

            // Optional: Mark all as read in backend
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
                new Notification("Notifications Enabled", {
                    body: "You will now receive updates from your community.",
                    icon: "/icon.png"
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to enable notifications");
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'follow': return <UserPlus className="h-5 w-5" />;
            case 'like': return <Heart className="h-5 w-5" />;
            case 'comment': return <MessageCircle className="h-5 w-5" />;
            case 'announcement': return <Megaphone className="h-5 w-5" />;
            default: return <Bell className="h-5 w-5" />;
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />

            <main className="mx-auto max-w-xl px-4 py-4">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
                    {permission === "default" && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={requestNotificationPermission}
                            className="gap-2 text-xs border-border text-foreground hover:bg-muted"
                        >
                            <BellRing className="h-3.5 w-3.5" />
                            Enable Push
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    {notifications.length === 0 && !isLoading && (
                        <div className="text-center py-10 text-muted-foreground">
                            <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    )}

                    <AnimatePresence initial={false} mode="popLayout">
                        {notifications.map((notification) => {
                            const isAnnouncement = notification.type === "announcement";

                            return (
                                <motion.div
                                    key={notification.id}
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TiltCard
                                        intensity={5}
                                        className={`group relative flex flex-col gap-3 rounded-xl border p-4 transition-all hover:bg-muted/50 ${isAnnouncement
                                                ? "bg-primary/5 border-primary/20"
                                                : notification.is_read
                                                    ? "bg-card border-border/50"
                                                    : "bg-muted/30 border-muted"
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isAnnouncement ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                                }`}>
                                                {getIcon(notification.type)}
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-foreground">
                                                            {notification.sender?.full_name || "System"}
                                                        </span>
                                                        {isAnnouncement && (
                                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20">
                                                                ANNOUNCEMENT
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>

                                                <p className="text-sm text-foreground/90 leading-relaxed">
                                                    {notification.content}
                                                </p>
                                            </div>

                                            {!notification.is_read && !isAnnouncement && (
                                                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </TiltCard>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default Alerts;
