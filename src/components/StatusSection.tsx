import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Heart, Send, X, Eye, ChevronUp, Type, Wand2, ArrowRight, Search, UserPlus, MessageCircle, User, Check, Share2, Trash2, Loader2, Sparkles, Globe, Users, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePosts } from "@/context/PostContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const FILTERS = [
    { name: "Normal", class: "" },
    { name: "Vivid", class: "contrast-125 saturate-125" },
    { name: "B&W", class: "grayscale contrast-110" },
    { name: "Vintage", class: "sepia contrast-90 brightness-110" },
    { name: "Soft", class: "brightness-110 contrast-90 saturate-90" },
    { name: "Dramatic", class: "contrast-125 brightness-90 saturate-110" },
];

const COLORS = ["#FFFFFF", "#000000", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

interface Story {
    id: string;
    media: string;
    caption: string;
    captionPosition: { x: number; y: number };
    captionColor: string;
    captionSize: number;
    filter: string;
    timestamp: string;
    visibility: 'public' | 'campus' | 'followers';
    campus_id?: string;
    user: {
        id: string;
        username: string;
        name: string;
        avatar: string; // URL
        initials: string;
    };
    upvotes: number;
    hasUpvoted: boolean;
    viewCount: number;
    isOwner: boolean;
}

const StatusSection = () => {
    const { currentUser, isAnonymousMode } = usePosts();
    const navigate = useNavigate();

    // Using a map to group stories by userID
    const [groupedStories, setGroupedStories] = useState<Record<string, Story[]>>({});
    const [realUserId, setRealUserId] = useState<string | null>(null);
    const [isLoadingStories, setIsLoadingStories] = useState(true);

    // Upload / Create State
    const [isCreatingStatus, setIsCreatingStatus] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [newStatusMedia, setNewStatusMedia] = useState<string | null>(null);
    const [newStatusCaption, setNewStatusCaption] = useState("");
    const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
    const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
    const [activeTool, setActiveTool] = useState<"text" | "filter" | null>(null);
    const [textColor, setTextColor] = useState(COLORS[0]);
    const [textSize, setTextSize] = useState([24]);
    const [visibility, setVisibility] = useState<'public' | 'campus' | 'followers'>('campus');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Viewing State
    const [viewingUserId, setViewingUserId] = useState<string | null>(null);
    const [activeStoryIndex, setActiveStoryIndex] = useState(0);
    const [replyText, setReplyText] = useState("");
    const [isPaused, setIsPaused] = useState(false);

    // Stats State
    const [showStats, setShowStats] = useState(false);
    const [statsData, setStatsData] = useState<{
        viewers: { id: string; name: string; avatar: string; initials: string, viewed_at: string }[];
        upvoters: { id: string; name: string; avatar: string; initials: string }[];
    } | null>(null);

    const [imageError, setImageError] = useState(false);
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    // --- 1. Fetch Real User ID (Bypassing Anon Mask for correct logic) ---
    useEffect(() => {
        const getRealUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setRealUserId(user.id);
        };
        getRealUser();
    }, []);

    // --- 2. Fetch Stories & Interactions ---
    const fetchStories = async () => {
        console.log("fetchStories called");
        try {
            // Fetch stories + profiles + all likes (count/check)
            // Removed story_views(count) to prevent potential RLS bottlenecks for now
            const { data, error } = await supabase
                .from('stories')
                .select(`
                    *,
                    profiles:user_id ( id, username, full_name, avatar_url ),
                    story_likes ( user_id )
                `)
                .gt('expires_at', new Date().toISOString()) // Only active stories
                .order('created_at', { ascending: true }); // Oldest first per user usually

            console.log("stories data length:", data?.length, "error:", error);
            if (error) {
                console.error("Supabase Error:", error);
                throw error;
            }

            if (data) {
                const stories: Story[] = data.map((s: any) => ({
                    id: s.id,
                    media: s.media_url,
                    caption: s.caption || "",
                    captionPosition: s.caption_settings?.x !== undefined ? { x: s.caption_settings.x, y: s.caption_settings.y } : { x: 0, y: 0 },
                    captionColor: s.caption_settings?.color || "#FFFFFF",
                    captionSize: s.caption_settings?.size || 24,
                    filter: s.filter_name || "Normal",
                    timestamp: s.created_at,
                    visibility: (s.visibility as 'public' | 'campus' | 'followers') || 'campus',
                    campus_id: s.campus_id || 'Campus',
                    user: {
                        id: s.profiles?.id || "unknown",
                        username: s.profiles?.username || "Unknown",
                        name: s.profiles?.full_name || s.profiles?.username || "Unknown",
                        avatar: s.profiles?.avatar_url || "",
                        initials: (s.profiles?.full_name || "U")[0],
                    },
                    upvotes: s.story_likes?.length || 0,
                    hasUpvoted: realUserId ? s.story_likes?.some((l: any) => l.user_id === realUserId) : false,
                    viewCount: 0, // Disabled view count on main feed for stability
                    isOwner: realUserId ? s.user_id === realUserId : false
                }));

                // Group by User ID
                const grouped = stories.reduce((acc, story) => {
                    const uid = story.user.id;
                    if (!acc[uid]) acc[uid] = [];
                    acc[uid].push(story);
                    return acc;
                }, {} as Record<string, Story[]>);

                setGroupedStories(grouped);
            }
        } catch (err: any) {
            console.error("Error fetching stories:", err);
            toast.error("Could not load stories: " + err.message);
        } finally {
            setIsLoadingStories(false);
        }
    };

    useEffect(() => {
        fetchStories();

        const storiesChannel = supabase
            .channel('public:stories')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
                console.log("Real-time story change detected, fetching stories");
                fetchStories();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(storiesChannel);
        };
    }, [realUserId]); // Refetch when user ID settles to update 'isOwner'/'hasUpvoted'

    // Derived Lists
    const myStories = realUserId ? (groupedStories[realUserId] || []) : [];
    // Sort other users by latest story timestamp
    const otherUserIds = Object.keys(groupedStories)
        .filter(uid => uid !== realUserId)
        .sort((a, b) => {
            const lastA = groupedStories[a][groupedStories[a].length - 1].timestamp;
            const lastB = groupedStories[b][groupedStories[b].length - 1].timestamp;
            return new Date(lastB).getTime() - new Date(lastA).getTime();
        });


    // --- 3. Creation Logic ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileToUpload(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setNewStatusMedia(event.target.result as string);
                    setIsCreatingStatus(true);
                    setNewStatusCaption("");
                    setSelectedFilter(FILTERS[0]);
                    setTextPosition({ x: 0, y: 0 });
                    setVisibility('campus');
                }
            };
            reader.readAsDataURL(file);
            e.target.value = ""; // Reset
        }
    };

    const uploadStory = async () => {
        if (!fileToUpload || !realUserId) return;
        setIsUploading(true);
        try {
            const fileExt = fileToUpload.name.split('.').pop();
            const cleanFileName = fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${realUserId}/${Date.now()}_${cleanFileName}.${fileExt}`;

            // 1. Upload
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, fileToUpload, {
                    contentType: fileToUpload.type,
                    upsert: false
                });
            console.log("Upload error:", uploadError);
            if (uploadError) throw uploadError;

            // 2. Get URL
            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(uploadData?.path || fileName);

            // 3. Insert DB
            const { error: insertError } = await supabase
                .from('stories')
                .insert({
                    user_id: realUserId,
                    media_url: publicUrl,
                    caption: newStatusCaption,
                    caption_settings: {
                        x: textPosition.x,
                        y: textPosition.y,
                        color: textColor,
                        size: textSize[0]
                    },
                    filter_name: selectedFilter.name,
                    campus_id: currentUser?.college || 'Campus',
                    visibility: visibility,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
                });
            console.log("Insert error:", insertError);
            if (insertError) throw insertError;

            console.log("Story inserted, refreshing stories");
            toast.success("Story added!");
            setIsCreatingStatus(false);
            setFileToUpload(null);
            setNewStatusMedia(null);
            fetchStories(); // Refresh

        } catch (e: any) {
            console.error(e);
            toast.error("Failed to upload story");
        } finally {
            setIsUploading(false);
        }
    };

    // --- 4. Viewing Logic ---
    const activeUserStories = (viewingUserId && groupedStories[viewingUserId]) ? groupedStories[viewingUserId] : [];
    const activeStory = activeUserStories.length > 0 ? activeUserStories[activeStoryIndex] : null;

    useEffect(() => {
        if (viewingUserId) {
            console.log("Viewing User:", viewingUserId);
            console.log("Active Stories:", activeUserStories);
            console.log("Active Story:", activeStory);
        }
    }, [viewingUserId, activeStoryIndex, activeStory]);

    useEffect(() => {
        setImgSrc(null);
        setImageError(false);
    }, [activeStory?.id]);

    // Mark as Viewed
    useEffect(() => {
        if (activeStory && realUserId && !activeStory.isOwner) {
            const markViewed = async () => {
                await supabase.from('story_views').insert({
                    story_id: activeStory.id,
                    viewer_id: realUserId
                }).maybeSingle(); // ignore duplicates
            };
            markViewed();
        }
    }, [activeStory?.id, realUserId]);

    // Timer
    useEffect(() => {
        if (!viewingUserId || !activeStory || isPaused || showStats) return;

        const timer = setTimeout(() => {
            handleNextStory();
        }, 5000);

        return () => clearTimeout(timer);
    }, [viewingUserId, activeStoryIndex, isPaused, showStats]);


    const handleNextStory = () => {
        if (activeStoryIndex < activeUserStories.length - 1) {
            setActiveStoryIndex(prev => prev + 1);
        } else {
            // Next user
            const currentGroupIndex = otherUserIds.indexOf(viewingUserId!);
            if (currentGroupIndex !== -1 && currentGroupIndex < otherUserIds.length - 1) {
                setViewingUserId(otherUserIds[currentGroupIndex + 1]);
                setActiveStoryIndex(0);
            } else {
                setViewingUserId(null); // Close
            }
        }
    };

    const handlePrevStory = () => {
        if (activeStoryIndex > 0) {
            setActiveStoryIndex(prev => prev - 1);
        } else {
            const currentGroupIndex = otherUserIds.indexOf(viewingUserId!);
            if (currentGroupIndex > 0) {
                const prevUserId = otherUserIds[currentGroupIndex - 1];
                setViewingUserId(prevUserId);
                setActiveStoryIndex(groupedStories[prevUserId].length - 1);
            } else {
                // If checking my stories or first user, just restart or close
                setActiveStoryIndex(0);
            }
        }
    };

    // --- 5. Interactions ---
    const handleUpvote = async () => {
        if (!activeStory || !realUserId) return;

        // Optimistic Update
        const isCurrentlyLiked = activeStory.hasUpvoted;
        const newLikeState = !isCurrentlyLiked;

        // Update local state deeply
        setGroupedStories(prev => {
            const userStories = [...(prev[activeStory.user.id] || [])];
            userStories[activeStoryIndex] = {
                ...activeStory,
                hasUpvoted: newLikeState,
                upvotes: activeStory.upvotes + (newLikeState ? 1 : -1)
            };
            return { ...prev, [activeStory.user.id]: userStories };
        });

        try {
            if (isCurrentlyLiked) {
                await supabase.from('story_likes').delete().eq('story_id', activeStory.id).eq('user_id', realUserId);
            } else {
                await supabase.from('story_likes').insert({ story_id: activeStory.id, user_id: realUserId });
            }
        } catch (e) {
            toast.error("Failed to update like");
            fetchStories(); // Revert
        }
    };

    const handleShare = () => {
        const text = `Check out ${activeStory?.user.username}'s story on Vook!`;
        if (navigator.share) {
            navigator.share({ title: "Vook Story", text, url: window.location.origin }).catch(console.error);
        } else {
            navigator.clipboard.writeText(`${text} ${window.location.origin}`);
            toast.success("Link copied to clipboard");
        }
    };

    const handleDelete = async () => {
        if (!activeStory) return;
        if (!confirm("Delete this story?")) return;

        try {
            const { error } = await supabase.from('stories').delete().eq('id', activeStory.id);
            if (error) throw error;
            toast.success("Story deleted");
            setViewingUserId(null); // Close viewer
            fetchStories(); // Refresh
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !activeStory || !realUserId) return;

        try {
            await supabase.from('story_comments').insert({
                story_id: activeStory.id,
                user_id: realUserId,
                content: replyText
            });
            toast.success("Reply sent!");
            setReplyText("");
            setIsPaused(false);
        } catch (e) {
            toast.error("Failed to send reply");
        }
    };

    // --- 6. Stats (Owner Only) ---
    useEffect(() => {
        if (showStats && activeStory && activeStory.isOwner) {
            const fetchStats = async () => {
                // Fetch Viewers
                const { data: views } = await supabase
                    .from('story_views')
                    .select('viewed_at, profiles:viewer_id(id, full_name, username, avatar_url)')
                    .eq('story_id', activeStory.id);

                // Fetch Upvoters
                const { data: likes } = await supabase
                    .from('story_likes')
                    .select('profiles:user_id(id, full_name, username, avatar_url)')
                    .eq('story_id', activeStory.id);

                setStatsData({
                    viewers: views?.map((v: any) => ({
                        id: v.profiles.id,
                        name: v.profiles.full_name || v.profiles.username,
                        avatar: v.profiles.avatar_url,
                        initials: (v.profiles.full_name || "U")[0],
                        viewed_at: v.viewed_at
                    })) || [],
                    upvoters: likes?.map((l: any) => ({
                        id: l.profiles.id,
                        name: l.profiles.full_name || l.profiles.username,
                        avatar: l.profiles.avatar_url,
                        initials: (l.profiles.full_name || "U")[0]
                    })) || []
                });
            };
            fetchStats();
        }
    }, [showStats, activeStory]);


    // Styles Helper
    const filterClass = (filterName: string) => FILTERS.find(f => f.name === filterName)?.class || "";

    // --- 7. Fullscreen Logic (Body Lock & ESC) ---
    useEffect(() => {
        if (viewingUserId) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [viewingUserId]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && viewingUserId) {
                setViewingUserId(null);
                setShowStats(false);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [viewingUserId]);

    return (
        <div className="py-4 border-b border-white/5">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />

            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max items-center space-x-4 px-4">

                    {/* My Story Bubble */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative group">
                            <div
                                className="cursor-pointer"
                                onClick={() => {
                                    if (myStories.length > 0) {
                                        setViewingUserId(realUserId);
                                        setActiveStoryIndex(0);
                                    } else {
                                        fileInputRef.current?.click();
                                    }
                                }}
                            >
                                <div className={`rounded-full p-[3px] ${myStories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 animate-[spin_10s_linear_infinite]' : 'bg-white/10'}`}>
                                    <Avatar className="h-16 w-16 border-4 border-black bg-zinc-900 transition-transform duration-300 group-hover:scale-105">
                                        <AvatarImage src={currentUser?.avatar} className="object-cover" />
                                        <AvatarFallback>{currentUser ? currentUser.initials : "?"}</AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>

                            <div
                                className="absolute bottom-0 right-0 rounded-full bg-blue-500 p-1 border-2 border-black cursor-pointer hover:bg-blue-600 transition-colors z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                            >
                                <Plus className="h-3 w-3 text-white" />
                            </div>
                        </div>
                        <span className="text-xs font-medium text-white/80">
                            {myStories.length > 0 ? "Your Story" : "Add Story"}
                        </span>
                    </div>

                    {/* Other Users Stories */}
                    {otherUserIds.map((uid) => {
                        const userStories = groupedStories[uid];
                        const user = userStories[0].user;
                        return (
                            <div key={uid} className="flex flex-col items-center gap-2">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="relative cursor-pointer"
                                    onClick={() => {
                                        setViewingUserId(uid);
                                        setActiveStoryIndex(0);
                                    }}
                                >
                                    <div className="rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                                        <Avatar className="h-16 w-16 border-4 border-black bg-zinc-900">
                                            <AvatarImage src={user.avatar} className="object-cover" />
                                            <AvatarFallback>{user.initials}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </motion.div>
                                <span className="text-xs font-medium text-white/80 w-16 truncate text-center">
                                    {user.username}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>

            {/* --- CREATE STORY MODAL --- */}
            <Dialog open={isCreatingStatus} onOpenChange={setIsCreatingStatus}>
                <DialogContent className="max-w-md h-[90vh] bg-black border-white/10 p-0 overflow-hidden flex flex-col items-center justify-center">
                    {newStatusMedia && (
                        <div className="relative w-full h-full bg-zinc-900 flex flex-col">
                            {/* Editor Area */}
                            <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center cursor-pointer"
                                onClick={(e) => {
                                    // Simple text positioning
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTextPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                                }}>
                                <img
                                    src={newStatusMedia}
                                    className={`max-w-full max-h-full object-contain ${selectedFilter.class}`}
                                    alt="preview"
                                />
                                {newStatusCaption && (
                                    <motion.p
                                        drag
                                        dragMomentum={false}
                                        className="absolute font-bold text-center cursor-move drop-shadow-md z-20 pointer-events-auto"
                                        style={{
                                            color: textColor,
                                            fontSize: `${textSize[0]}px`,
                                            top: textPosition.y,
                                            left: textPosition.x,
                                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {newStatusCaption}
                                    </motion.p>
                                )}
                            </div>

                            {/* Tools Overlay */}
                            <AnimatePresence>
                                {activeTool && (
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 20, opacity: 0 }}
                                        className="absolute inset-x-0 bottom-24 p-4 bg-black/80 backdrop-blur-md border-t border-white/10 z-30"
                                    >
                                        {activeTool === "filter" && (
                                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                                {FILTERS.map(f => (
                                                    <div key={f.name} className="flex flex-col items-center gap-1 min-w-[60px] cursor-pointer group" onClick={() => setSelectedFilter(f)}>
                                                        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${selectedFilter.name === f.name ? "border-primary" : "border-white/20"}`}>
                                                            <img src={newStatusMedia} className={`w-full h-full object-cover ${f.class}`} />
                                                        </div>
                                                        <span className={`text-[10px] ${selectedFilter.name === f.name ? "text-primary" : "text-white/60"}`}>{f.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {activeTool === "text" && (
                                            <div className="space-y-4">
                                                <Input
                                                    autoFocus
                                                    value={newStatusCaption}
                                                    onChange={(e) => setNewStatusCaption(e.target.value)}
                                                    placeholder="Add a caption..."
                                                    className="bg-transparent border-0 border-b border-white/20 text-white text-center text-xl focus-visible:ring-0 placeholder:text-white/30"
                                                />
                                                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {COLORS.map(c => (
                                                        <button
                                                            key={c}
                                                            className={`w-6 h-6 rounded-full border border-white/10 ${textColor === c ? 'ring-2 ring-white scale-110' : ''}`}
                                                            style={{ backgroundColor: c }}
                                                            onClick={() => setTextColor(c)}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="px-2">
                                                    <Slider value={textSize} onValueChange={setTextSize} min={12} max={64} step={1} className="w-full" />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Controls */}
                            <div className="absolute top-4 right-4 flex flex-col gap-3 z-30">
                                <Button size="icon" variant="ghost" className="rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm" onClick={() => setActiveTool(activeTool === "text" ? null : "text")}>
                                    <Type className="h-5 w-5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm" onClick={() => setActiveTool(activeTool === "filter" ? null : "filter")}>
                                    <Wand2 className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 bg-black border-t border-white/10 flex justify-between items-center z-40">
                                <div className="flex items-center gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white text-xs px-2 gap-1 h-8 rounded-full border border-white/10 bg-white/5 outline-none">
                                                {visibility === 'public' && <Globe className="h-3 w-3" />}
                                                {visibility === 'campus' && <Users className="h-3 w-3" />}
                                                {visibility === 'followers' && <Lock className="h-3 w-3" />}
                                                {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-zinc-900 border-white/10 w-56 z-[60]">
                                            <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onClick={() => setVisibility('public')}>
                                                <Globe className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span className="text-white">Public</span>
                                                    <span className="text-[10px] text-white/50">Visible to everyone</span>
                                                </div>
                                                {visibility === 'public' && <Check className="ml-auto h-4 w-4 text-primary" />}
                                            </DropdownMenuItem>

                                            <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onClick={() => setVisibility('campus')}>
                                                <Users className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span className="text-white">Campus Only</span>
                                                    <span className="text-[10px] text-white/50">{currentUser?.college || "Your Campus"}</span>
                                                </div>
                                                {visibility === 'campus' && <Check className="ml-auto h-4 w-4 text-primary" />}
                                            </DropdownMenuItem>

                                            <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onClick={() => setVisibility('followers')}>
                                                <Lock className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span className="text-white">Followers Only</span>
                                                    <span className="text-[10px] text-white/50">Only people who follow you</span>
                                                </div>
                                                {visibility === 'followers' && <Check className="ml-auto h-4 w-4 text-primary" />}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setIsCreatingStatus(false)}>Cancel</Button>
                                    <Button
                                        className="bg-primary text-white rounded-full px-6"
                                        onClick={uploadStory}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                        Share
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>


            {/* --- STORY VIEWER OVERLAY (Portal) --- */}
            {viewingUserId && createPortal(
                <div className="fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black flex flex-col relative overflow-hidden touch-none overscroll-none">
                    {!activeStory ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p>Loading story...</p>
                            {/* Fallback Close */}
                            <Button size="sm" variant="outline" className="mt-4 bg-transparent border-white/20 text-white" onClick={() => setViewingUserId(null)}>Close</Button>
                        </div>
                    ) : (
                        <>
                            {/* Background Blur */}
                            <div className="absolute inset-0 z-0 opacity-30">
                                <img src={activeStory.media} className="w-full h-full object-cover blur-3xl scale-150" />
                            </div>

                            {/* Progress Bar */}
                            <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2 pt-4">
                                {activeUserStories.map((_, idx) => (
                                    <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: idx < activeStoryIndex ? "100%" : idx === activeStoryIndex ? "100%" : "0%" }}
                                            transition={{ duration: idx === activeStoryIndex ? 5 : 0, ease: "linear" }}
                                            className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Header */}
                            <div className="absolute top-8 left-0 right-0 z-40 flex items-center justify-between px-4">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                                    setViewingUserId(null);
                                    navigate(`/profile/${activeStory.user.id}`);
                                }}>
                                    <Avatar className="h-9 w-9 border-2 border-white/20">
                                        <AvatarImage src={activeStory.user.avatar} />
                                        <AvatarFallback>{activeStory.user.initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col drop-shadow-md">
                                        <span className="text-sm font-bold text-white leading-none">{activeStory.user.username}</span>
                                        <span className="text-xs text-white/70">{formatDistanceToNow(new Date(activeStory.timestamp), { addSuffix: true })}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {activeStory.isOwner && (
                                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={handleDelete}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={() => setViewingUserId(null)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Main Content (Navigable) */}
                            <div className="flex-1 relative z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm -mx-1">
                                {/* Click areas for nav */}
                                <div className="absolute inset-y-0 left-0 w-1/3 z-20" onClick={handlePrevStory} />
                                <div className="absolute inset-y-0 right-0 w-1/3 z-20" onClick={handleNextStory} />

                                {imageError ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-center text-white/50 z-20 pointer-events-auto">
                                        <div className="bg-red-500/10 p-4 rounded-full mb-4">
                                            <Sparkles className="h-6 w-6 text-red-500" />
                                        </div>
                                        <p className="mb-4 text-sm font-medium">Could not load story.</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                            onClick={() => {
                                                setImageError(false);
                                                setImgSrc(null);
                                            }}>
                                            Retry
                                        </Button>
                                    </div>
                                ) : (
                                    <img
                                        key={imgSrc || activeStory.media}
                                        src={imgSrc || activeStory.media}
                                        className={`max-h-full max-w-full object-contain ${filterClass(activeStory.filter)}`}
                                        onError={async (e) => {
                                            console.warn("Public load failed, trying signed URL fallback...", activeStory.media);
                                            const currentSrc = e.currentTarget.src;

                                            // Prevents infinite loop if signed URL also fails
                                            if (currentSrc.includes("token=")) {
                                                e.currentTarget.style.display = 'none';
                                                setImageError(true);
                                                return;
                                            }

                                            try {
                                                // 1. Try Regex Extraction
                                                const match = activeStory.media.match(/\/images\/(.+)$/);
                                                let path = match ? match[1] : null;

                                                // 2. Fallback: try using the string after the last slash if mostly simple structure
                                                if (!path) {
                                                    const parts = activeStory.media.split('/');
                                                    const imageIndex = parts.indexOf('images');
                                                    if (imageIndex !== -1 && imageIndex < parts.length - 1) {
                                                        path = parts.slice(imageIndex + 1).join('/');
                                                    }
                                                }

                                                console.log("Extracted path for signed URL:", path);

                                                if (path) {
                                                    const { data, error } = await supabase.storage.from('images').createSignedUrl(path, 60);

                                                    if (data?.signedUrl) {
                                                        setImgSrc(data.signedUrl);
                                                    } else {
                                                        console.error("Signed URL creation failed:", error);
                                                        setImageError(true);
                                                    }
                                                } else {
                                                    console.error("Could not extract path from URL:", activeStory.media);
                                                    setImageError(true);
                                                }
                                            } catch (err) {
                                                console.error("Fallback failed", err);
                                                setImageError(true);
                                            }
                                        }}
                                    />
                                )}
                                {/* Fallback if image loading */}
                                {!imageError && !imgSrc && (
                                    <div className="-z-10 absolute inset-0 flex items-center justify-center text-white/20 text-xs animate-pulse">
                                        Loading...
                                    </div>
                                )}

                                {activeStory.caption && (
                                    <p
                                        className="absolute z-10 font-bold text-center pointer-events-none drop-shadow-xl"
                                        style={{
                                            color: activeStory.captionColor,
                                            fontSize: `${activeStory.captionSize}px`,
                                            top: activeStory.captionPosition.x === 0 ? 'auto' : activeStory.captionPosition.y, // Fallback center if 0
                                            left: activeStory.captionPosition.x === 0 ? 'auto' : activeStory.captionPosition.x,
                                            bottom: activeStory.captionPosition.x === 0 ? '15%' : 'auto', // Default bottom
                                            width: activeStory.captionPosition.x === 0 ? '100%' : 'auto'
                                        }}
                                    >
                                        {activeStory.caption}
                                    </p>
                                )}
                            </div>

                            {/* Footer / Interactions */}
                            <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/60 to-transparent pt-12">
                                {!activeStory.isOwner ? (
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <Input
                                                className="bg-white/10 border-white/10 text-white rounded-full pl-4 pr-10 focus:bg-white/20 transition-all placeholder:text-white/50"
                                                placeholder="Send a message..."
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                onFocus={() => setIsPaused(true)}
                                                onBlur={() => setIsPaused(false)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                            />
                                            {replyText && (
                                                <button onClick={handleSendReply} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary">
                                                    <Send className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-white hover:scale-110 transition-transform" onClick={handleUpvote}>
                                            <Heart className={`h-6 w-6 ${activeStory.hasUpvoted ? "fill-red-500 text-red-500" : ""}`} />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-white hover:scale-110 transition-transform" onClick={handleShare}>
                                            <Share2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-white/90 px-2" onClick={() => setShowStats(!showStats)}>
                                            <div className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:underline decoration-white/50">
                                                <Eye className="h-4 w-4" />
                                                {activeStory.viewCount} Views
                                            </div>
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <Heart className="h-4 w-4 fill-white/20" />
                                                {activeStory.upvotes} Likes
                                            </div>
                                        </div>
                                        {showStats && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                className="bg-zinc-900/90 backdrop-blur-md rounded-xl p-4 mt-2 max-h-64 overflow-hidden flex flex-col"
                                            >
                                                <h4 className="text-xs font-bold text-white/50 uppercase mb-3 flex items-center justify-between">
                                                    <span>Story Insights</span>
                                                    <ChevronUp className="h-3 w-3 cursor-pointer" onClick={() => setShowStats(false)} />
                                                </h4>

                                                <ScrollArea className="flex-1 -mr-3 pr-3">
                                                    <div className="space-y-4">
                                                        {(!statsData?.viewers.length && !statsData?.upvoters.length) && (
                                                            <div className="text-center text-xs text-white/30 py-4">No interactions yet.</div>
                                                        )}

                                                        {statsData?.upvoters && statsData.upvoters.length > 0 && (
                                                            <div>
                                                                <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Heart className="h-3 w-3" /> Liked by</p>
                                                                <div className="space-y-2">
                                                                    {statsData.upvoters.map(u => (
                                                                        <div key={u.id} className="flex items-center gap-2">
                                                                            <Avatar className="h-6 w-6">
                                                                                <AvatarImage src={u.avatar} />
                                                                                <AvatarFallback className="text-[9px]">{u.initials}</AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-sm text-white">{u.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {statsData?.viewers && statsData.viewers.length > 0 && (
                                                            <div>
                                                                <p className="text-xs text-white/40 mb-2 mt-4 flex items-center gap-1"><Eye className="h-3 w-3" /> Viewed by</p>
                                                                <div className="space-y-2">
                                                                    {statsData.viewers.map(u => (
                                                                        <div key={u.id} className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <Avatar className="h-6 w-6">
                                                                                    <AvatarImage src={u.avatar} />
                                                                                    <AvatarFallback className="text-[9px]">{u.initials}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-sm text-white">{u.name}</span>
                                                                            </div>
                                                                            <span className="text-[9px] text-white/30">{formatDistanceToNow(new Date(u.viewed_at))}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>,
                document.body
            )}
        </div >
    );
};

export default StatusSection;
