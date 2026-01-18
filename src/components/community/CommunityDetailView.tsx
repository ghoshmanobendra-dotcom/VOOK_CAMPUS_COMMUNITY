import { useState, useEffect } from "react";
import { Users, FileText, Image as ImageIcon, Settings, UserPlus, Link, MoreHorizontal, Calendar, MessageSquare, Volume2, Megaphone, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import TiltCard from "@/components/TiltCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import CommunityPostEditor from "./CommunityPostEditor";
import MicFeedPanel from "./MicFeedPanel";
import AnnouncementButton from "./AnnouncementButton";
import CommunitySettingsDialog from "./CommunitySettingsDialog";
import CommunityInviteDialog from "./CommunityInviteDialog";
import CommunityMediaTab from "./CommunityMediaTab";

interface CommunityDetailViewProps {
    community: any;
    groups: any[];
    onOpenGroup: (group: any) => void;
    onInvite: () => void;
    onOpenAnnouncement: () => void;
}

const CommunityDetailView = ({ community, groups, onOpenGroup, onInvite }: CommunityDetailViewProps) => {
    const [activeTab, setActiveTab] = useState("posts");
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<"post" | "announcement">("post");
    const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);

    // Dialog States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);

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
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-background/80 backdrop-blur-sm border-transparent shadow-sm hidden md:flex"
                        onClick={() => setIsInviteOpen(true)}
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite
                    </Button>

                    {/* Mic Button Switcher - Moved to Header */}
                    <AnnouncementButton
                        communityId={community.id}
                        onToggle={setIsAnnouncementsOpen}
                        isOpen={isAnnouncementsOpen}
                    />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-lg"
                        onClick={() => setIsInviteOpen(true)}
                    >
                        <Link className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-lg"
                        onClick={() => setIsSettingsOpen(true)}
                    >
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

                            {/* Setup Cards - Minimal */}
                            {groups.length <= 1 && (
                                <div className="space-y-4">
                                    <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <Megaphone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm">Join the conversation</h3>
                                                <p className="text-xs text-muted-foreground">Click the mic in the header to view posts</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => setIsAnnouncementsOpen(true)}>Open Discussion</Button>
                                    </div>
                                </div>
                            )}

                            {/* Minimal Placeholder instructions for Feed - BOTTOM FEED REMOVED */}
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/20">
                                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                                <h3 className="text-lg font-medium text-foreground/80">Discussions are in the side panel</h3>
                                <p className="text-sm max-w-xs text-center mt-2">
                                    Click the <span className="inline-flex items-center justify-center p-1 bg-background rounded-full shadow-sm mx-1 align-middle"><Volume2 className="w-3 h-3 text-primary" /></span> icon in the header to view conversations.
                                </p>
                                <Button className="mt-6" variant="secondary" onClick={() => setIsAnnouncementsOpen(true)}>
                                    Open Discussion Panel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* FILES TAB */}
                    {activeTab === 'files' && (
                        <CommunityMediaTab communityId={community.id} type="files" />
                    )}

                    {/* PHOTOS TAB */}
                    {activeTab === 'photos' && (
                        <CommunityMediaTab communityId={community.id} type="photos" />
                    )}

                </div>
            </ScrollArea>

            {/* Interactive Dialogs */}
            <CommunitySettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                community={community}
                onUpdate={() => {
                    // Ideally trigger a refresh of community data here
                    toast.success("Community updated");
                }}
            />

            <CommunityInviteDialog
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
                community={community}
            />

            {/* Mic Feed Panel (Overlay) */}
            <MicFeedPanel
                communityId={community.id}
                communityName={community.name}
                isOpen={isAnnouncementsOpen}
                onClose={() => setIsAnnouncementsOpen(false)}
            />
        </div>
    );
};

export default CommunityDetailView;
