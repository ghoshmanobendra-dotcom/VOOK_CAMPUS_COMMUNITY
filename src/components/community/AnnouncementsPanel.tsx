import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Megaphone, Pin, Search, Filter, Mic, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface AnnouncementsPanelProps {
    communityId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    is_pinned: boolean;
    created_at: string;
    author: {
        full_name: string;
        avatar_url: string;
        role?: string;
    };
    views: number;
    files?: string[];
    images?: string[];
}

const AnnouncementsPanel = ({ communityId, isOpen, onClose }: AnnouncementsPanelProps) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'urgent' | 'pinned'>('all');
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isOpen && communityId) {
            fetchAnnouncements();
            // Mark as read
            localStorage.setItem(`announcements_read_${communityId}`, new Date().toISOString());
        }
    }, [isOpen, communityId]);

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    author:author_id (full_name, avatar_url),
                    views:announcement_views(count)
                `)
                .eq('community_id', communityId)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = data.map((item: any) => ({
                ...item,
                views: item.views?.[0]?.count || 0,
                priority: item.priority || 'normal' // Fallback for migrated data
            }));

            setAnnouncements(formatted);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-950/20';
            case 'high': return 'border-l-4 border-orange-500 bg-orange-50/50 dark:bg-orange-950/20';
            case 'low': return 'border-l-4 border-slate-400 bg-slate-50/50 dark:bg-slate-900/20';
            default: return 'border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
        }
    };

    const filteredAnnouncements = announcements.filter(a => {
        if (filter === 'urgent' && a.priority !== 'urgent') return false;
        if (filter === 'pinned' && !a.is_pinned) return false;
        if (searchQuery && !a.content.toLowerCase().includes(searchQuery.toLowerCase()) && !a.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/50">

                {/* Header */}
                <SheetHeader className="p-6 border-b shrink-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                <Megaphone className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle>Announcements</SheetTitle>
                                <SheetDescription>Official updates & important news</SheetDescription>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search announcements..."
                                className="pl-9 bg-background/50 border-transparent focus-visible:bg-background transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            <Badge
                                variant={filter === 'all' ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setFilter('all')}
                            >
                                All
                            </Badge>
                            <Badge
                                variant={filter === 'urgent' ? 'destructive' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setFilter('urgent')}
                            >
                                Urgent
                            </Badge>
                            <Badge
                                variant={filter === 'pinned' ? 'secondary' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setFilter('pinned')}
                            >
                                Pinned
                            </Badge>
                        </div>
                    </div>
                </SheetHeader>

                {/* Content */}
                <ScrollArea className="flex-1 bg-muted/5 p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredAnnouncements.length > 0 ? (
                        <div className="space-y-4">
                            {filteredAnnouncements.map((announcement) => (
                                <div
                                    key={announcement.id}
                                    className={`relative group bg-card hover:bg-card/80 transition-all p-5 rounded-r-xl rounded-l-sm shadow-sm hover:shadow-md border border-border/50 ${getPriorityColor(announcement.priority)}`}
                                >
                                    {announcement.is_pinned && (
                                        <div className="absolute top-2 right-2 text-muted-foreground/50 rotate-45">
                                            <Pin className="h-4 w-4 fill-current" />
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3 mb-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={announcement.author.avatar_url} />
                                            <AvatarFallback>{announcement.author.full_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground">{announcement.author.full_name}</h4>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                                                {announcement.priority === 'urgent' && (
                                                    <Badge variant="destructive" className="h-4 px-1 text-[10px]">URGENT</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {announcement.title && (
                                        <h3 className="text-lg font-bold mb-2 text-foreground">{announcement.title}</h3>
                                    )}

                                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                        {announcement.content}
                                    </div>

                                    {announcement.images && announcement.images.length > 0 && (
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            {announcement.images.map((img, i) => (
                                                <img key={i} src={img} alt="Attachment" className="rounded-md object-cover w-full h-32 bg-muted" />
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-4">
                                            <button className="flex items-center gap-1 hover:text-primary transition-colors">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                <span>Mark Read</span>
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>Read by {announcement.views}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <Mic className="h-8 w-8 opacity-20" />
                            </div>
                            <p className="font-medium">No announcements found</p>
                            <p className="text-xs">Check back later for updates</p>
                        </div>
                    )}
                </ScrollArea>

                {/* Admin Action (Placeholder for where "Create" would go) */}
                <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
                    {/* Logic to show only for admin would be here */}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default AnnouncementsPanel;
