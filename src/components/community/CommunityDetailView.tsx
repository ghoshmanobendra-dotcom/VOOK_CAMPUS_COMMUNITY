import { useState, useEffect } from "react";
import { Users, FileText, Image as ImageIcon, Settings, UserPlus, Link, MoreHorizontal, Calendar, MessageSquare, Volume2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import TiltCard from "@/components/TiltCard";
import { supabase } from "@/integrations/supabase/client";

import CommunityPostEditor from "./CommunityPostEditor";
import CommunityFeed from "./CommunityFeed";
import CommunityAnnouncementsDialog from "./CommunityAnnouncementsDialog";

interface CommunityDetailViewProps {
    community: any;
    groups: any[];
    onOpenGroup: (group: any) => void;
    onOpenAnnouncement: () => void;
    onInvite: () => void;
}

const CommunityDetailView = ({ community, groups, onOpenGroup, onOpenAnnouncement, onInvite }: CommunityDetailViewProps) => {
    const [activeTab, setActiveTab] = useState("posts");
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<"post" | "announcement">("post");
    const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
    const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);

    useEffect(() => {
        if (community?.id) {
            checkNewAnnouncements();
        }
    }, [community?.id]);

    const checkNewAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('created_at')
                .eq('community_id', community.id)
                .eq('is_official', true)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const latestAnnouncementTime = new Date(data[0].created_at).getTime();
                const lastSeenTimeStr = localStorage.getItem(`last_seen_announcements_${community.id}`);
                const lastSeenTime = lastSeenTimeStr ? new Date(lastSeenTimeStr).getTime() : 0;

                if (latestAnnouncementTime > lastSeenTime) {
                    setHasNewAnnouncements(true);
                } else {
                    setHasNewAnnouncements(false);
                }
            } else {
                setHasNewAnnouncements(false);
            }
        } catch (error) {
            console.error("Error checking announcements:", error);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-background/50 overflow-hidden relative">

            {/* 1. Header Banner */}
            <div className="h-48 relative shrink-0">
                {/* Placeholder Gradient Banner - In real app, could be custom image */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-cyan-100 dark:from-emerald-950/30 dark:to-cyan-950/30">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay" />
                </div>

                {/* Community Info Overlay */}
                <div className="absolute bottom-4 left-6 flex items-end gap-4 z-10">
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 p-1 shadow-lg shadow-black/5">
                        <Avatar className="w-full h-full rounded-lg">
                            <AvatarImage src={community.image_url} />
                            <AvatarFallback className="rounded-lg bg-indigo-600 text-white font-bold text-xl">
                                {community.name[0]}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="mb-1">
                        <h1 className="text-2xl font-bold text-foreground drop-shadow-sm">{community.name}</h1>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="absolute bottom-4 right-6 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm border-transparent shadow-sm hidden md:flex" onClick={onInvite}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite
                    </Button>

                    {/* Announcement Button */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-lg relative"
                            onClick={() => {
                                setIsAnnouncementsOpen(true);
                                setHasNewAnnouncements(false);
                            }}
                        >
                            <Megaphone className="h-4 w-4" />
                        </Button>
                        {hasNewAnnouncements && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                            </span>
                        )}
                    </div>

                    <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-lg">
                        <Link className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-lg">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* 2. Navigation Tabs */}
            <div className="px-6 border-b border-border bg-background z-10">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-transparent h-12 p-0 space-x-6 w-full justify-start rounded-none">
                            <TabsTrigger
                                value="posts"
                                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-medium"
                            >
                                Posts
                            </TabsTrigger>
                            <TabsTrigger
                                value="files"
                                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-medium"
                            >
                                Files
                            </TabsTrigger>
                            <TabsTrigger
                                value="photos"
                                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-medium"
                            >
                                Photos
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>
            </div>

            {/* 3. Tab Content */}
            <ScrollArea className="flex-1 bg-muted/10">
                <div className="p-6 max-w-5xl mx-auto space-y-8">

                    {/* POSTS TAB */}
                    {activeTab === 'posts' && (
                        <div className="space-y-6">

                            {/* Section 1: Create Post / Announcement */}
                            {isEditorOpen ? (
                                <CommunityPostEditor
                                    communityId={community.id}
                                    communityName={community.name}
                                    onCancel={() => setIsEditorOpen(false)}
                                    onSuccess={() => setIsEditorOpen(false)}
                                    defaultType={editorMode}
                                />
                            ) : (
                                <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                                    <div className="flex gap-4">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-primary/10 text-primary">ME</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-3">
                                            <div
                                                className="bg-muted/50 border border-transparent rounded-lg px-4 py-2.5 text-muted-foreground text-sm cursor-text hover:bg-muted transition-colors"
                                                onClick={() => {
                                                    setEditorMode("post");
                                                    setIsEditorOpen(true);
                                                }}
                                            >
                                                Post in group...
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    size="sm"
                                                    className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg font-medium shadow-sm transition-all"
                                                    onClick={() => {
                                                        setEditorMode("post");
                                                        setIsEditorOpen(true);
                                                    }}
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Post
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 rounded-lg"
                                                    onClick={() => {
                                                        setEditorMode("announcement");
                                                        setIsEditorOpen(true);
                                                    }}
                                                >
                                                    <Volume2 className="w-4 h-4" />
                                                    Announcement
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Setup Cards */}
                            {groups.length <= 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold">Set up your community</h3>
                                        <p className="text-sm text-muted-foreground">Get started with these quick actions</p>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors shadow-sm" onClick={onInvite}>
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                                <UserPlus className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-sm">Invite members</span>
                                        </div>
                                        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors shadow-sm" onClick={() => {
                                            setEditorMode("announcement");
                                            setIsEditorOpen(true);
                                        }}>
                                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                <MessageSquare className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-sm">Create welcome message</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section 2: Posts / Announcements (Feed View) */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider hidden">Feed</h3>
                                <CommunityFeed communityId={community.id} communityName={community.name} />
                            </div>
                        </div>
                    )}

                    {/* FILES TAB */}
                    {activeTab === 'files' && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <FileText className="w-16 h-16 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-foreground">No files yet</h3>
                            <p className="text-sm">Files shared in groups will appear here.</p>
                        </div>
                    )}

                    {/* PHOTOS TAB */}
                    {activeTab === 'photos' && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-foreground">No photos yet</h3>
                            <p className="text-sm">Photos shared in groups will appear here.</p>
                        </div>
                    )}

                </div>
            </ScrollArea>

            <CommunityAnnouncementsDialog
                communityId={community.id}
                communityName={community.name}
                isOpen={isAnnouncementsOpen}
                onOpenChange={setIsAnnouncementsOpen}
            />
        </div>
    );
};

export default CommunityDetailView;
