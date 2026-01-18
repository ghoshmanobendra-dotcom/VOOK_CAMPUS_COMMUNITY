
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Heart, Send, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Story } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoryViewerProps {
    stories: Story[];
    initialIndex?: number;
    onClose: () => void;
    onNextGroup?: () => void;
    onPrevGroup?: () => void;
    onView: (storyId: string) => void;
    currentUserId: string;
}

export const StoryViewer = ({ stories, initialIndex = 0, onClose, onNextGroup, onPrevGroup, onView, currentUserId, deleteStory }: StoryViewerProps & { deleteStory?: (id: string) => Promise<void> }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPaused, setIsPaused] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isLiked, setIsLiked] = useState(false);
    const [showInsights, setShowInsights] = useState(false);
    const [insightsTab, setInsightsTab] = useState<'views' | 'likes'>('views');

    const story = stories[currentIndex];
    const isOwner = story?.user_id === currentUserId;

    useEffect(() => {
        if (story) {
            onView(story.id);
            if (!isOwner) checkLikeStatus();
        }
    }, [story, currentIndex]);

    // Pausing when insights are open
    useEffect(() => {
        if (showInsights) {
            setIsPaused(true);
        } else {
            setIsPaused(false);
        }
    }, [showInsights]);

    const checkLikeStatus = async () => {
        if (!story || !currentUserId) return;
        const { data } = await supabase.from('story_likes').select('id').eq('story_id', story.id).eq('user_id', currentUserId).maybeSingle();
        setIsLiked(!!data);
    }

    // Auto Advance
    useEffect(() => {
        if (isPaused || !story || showInsights) return;

        const timer = setTimeout(() => {
            handleNext();
        }, 5000); // 5 seconds per story

        return () => clearTimeout(timer);
    }, [currentIndex, isPaused, story, showInsights]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onNextGroup ? onNextGroup() : onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            onPrevGroup ? onPrevGroup() : onClose();
        }
    };

    const toggleLike = async () => {
        setIsLiked(prev => !prev); // Optimistic
        try {
            if (isLiked) {
                await supabase.from('story_likes').delete().eq('story_id', story.id).eq('user_id', currentUserId);
            } else {
                await supabase.from('story_likes').insert({ story_id: story.id, user_id: currentUserId });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const sendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        const text = replyText;
        setReplyText(""); // Clear immediately

        try {
            await supabase.from('story_replies').insert({
                story_id: story.id,
                sender_id: currentUserId,
                message: text
            });
            toast.success("Reply sent");
        } catch (err) {
            toast.error("Failed to send reply");
        }
    };

    const handleDelete = async () => {
        if (!deleteStory || !story) return;
        if (confirm("Are you sure you want to delete this story?")) {
            await deleteStory(story.id);
            // After delete, create a new list excluding this story
            // But 'stories' prop is immutable here, we rely on parent update or local hack ?
            // Usually parent updates props.
            // But we should close or move next.
            // If it was the last story, close.
            if (stories.length <= 1) {
                onClose();
            } else {
                // Assuming parent re-renders with new list, this component might re-mount or update. 
                // If we stay, we might look at a deleted story until update.
                // Ideally we blindly move next or close.
                onClose();
            }
        }
    };

    if (!story) return null;

    // Insights Data
    const viewCount = story.story_views?.length || 0;
    const likeCount = story.story_likes?.length || 0;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
            {/* Background Blur */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <img src={story.media_url} className="w-full h-full object-cover blur-3xl" alt="blur bg" />
            </div>

            {/* Content Container (Mobile Aspect Ratio) */}
            <div className="relative w-full max-w-md h-full md:h-[90vh] bg-zinc-900 md:rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans">

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2">
                    {stories.map((s, idx) => {
                        const isActive = idx === currentIndex;
                        const isCompleted = idx < currentIndex;
                        return (
                            <div key={s.id} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white"
                                    style={{
                                        width: isCompleted ? '100%' : isActive ? '100%' : '0%',
                                        transition: isActive && !isPaused && !showInsights ? 'width 5s linear' : 'none'
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Header */}
                <div className="absolute top-4 left-0 right-0 z-50 px-4 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border border-white/20">
                            <AvatarImage src={story.profiles.avatar_url} />
                            <AvatarFallback>{story.profiles.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white drop-shadow-md">{story.profiles.username}</span>
                            {story.visibility === 'campus' && <span className="text-[10px] bg-white/20 px-1 rounded text-white self-start">Campus</span>}
                            <span className="text-[10px] text-white/70 drop-shadow-md">
                                {new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        {isOwner && (
                            <button onClick={handleDelete} className="text-white/80 hover:text-red-500 transition-colors">
                                <span className="sr-only">Delete</span>
                                {/* Trash Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                            </button>
                        )}
                        <button onClick={onClose}>
                            <X className="text-white h-6 w-6 drop-shadow-md" />
                        </button>
                    </div>
                </div>

                {/* Tap Zones */}
                <div className="absolute inset-0 flex z-10">
                    <div className="w-1/3 h-full" onClick={handlePrev}></div>
                    <div className="w-1/3 h-full" onClick={() => setIsPaused(p => !p)}></div>
                    <div className="w-1/3 h-full" onClick={handleNext}></div>
                </div>

                {/* Media */}
                <div className="flex-1 flex items-center justify-center bg-black">
                    {story.media_type === 'video' ? (
                        <video src={story.media_url} className="w-full h-full object-contain" autoPlay muted playsInline loop />
                    ) : (
                        <img src={story.media_url} className="w-full h-full object-contain" alt="Story" />
                    )}
                </div>

                {/* Caption Overlay */}
                {story.caption && (
                    <div className="absolute bottom-20 left-0 right-0 p-4 text-center z-20 pointer-events-none">
                        <p className="inline-block bg-black/50 px-3 py-1 rounded-lg text-white font-medium backdrop-blur-sm">
                            {story.caption}
                        </p>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-50">
                    {isOwner ? (
                        // OWNER VIEW
                        <div className="flex items-center justify-between px-2 pt-2">
                            <div
                                className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setShowInsights(true)}
                            >
                                <div className="flex items-center gap-2 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                    <span className="text-sm font-semibold">{viewCount}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400">Views</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2 text-white">
                                    <Heart className="h-5 w-5 fill-white text-white" />
                                    <span className="text-sm font-semibold">{likeCount}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400">Likes</span>
                            </div>

                            <div className="flex-1"></div> {/* Spacer */}

                            <button className="text-white/50 p-2" disabled>
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        // VIEWER VIEW
                        <div className="flex gap-3 items-center">
                            <form onSubmit={sendReply} className="flex-1">
                                <div className="relative">
                                    <Input
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onFocus={() => setIsPaused(true)}
                                        onBlur={() => setIsPaused(false)}
                                        placeholder={`Reply to @${story.profiles.username}...`}
                                        className="bg-transparent border-white/40 text-white placeholder:text-white/70 rounded-full h-10 pr-10 focus-visible:ring-0 focus-visible:border-white"
                                    />
                                </div>
                            </form>
                            <button
                                onClick={toggleLike}
                                className={`p-2 rounded-full transition-transform active:scale-95 ${isLiked ? 'text-red-500' : 'text-white'}`}
                            >
                                <Heart className={`h-7 w-7 ${isLiked ? 'fill-current' : ''}`} />
                            </button>
                            <button className="text-white p-2">
                                <Send className="h-6 w-6 -rotate-45" />
                            </button>
                        </div>
                    )}
                </div>

                {/* INSIGHTS MODAL (Internal Sheet) */}
                {isOwner && (
                    <>
                        {/* Backdrop */}
                        <div
                            className={`absolute inset-0 bg-black/60 z-[60] transition-opacity duration-300 ${showInsights ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            onClick={() => setShowInsights(false)}
                        />

                        {/* Sheet */}
                        <div className={`absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl z-[70] transition-transform duration-300 ease-out border-t border-white/10 ${showInsights ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '70%' }}>
                            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto my-3" />

                            {/* Tabs */}
                            <div className="flex border-b border-white/10">
                                <button
                                    className={`flex-1 py-3 text-sm font-medium ${insightsTab === 'views' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
                                    onClick={() => setInsightsTab('views')}
                                >
                                    Views ({viewCount})
                                </button>
                                <button
                                    className={`flex-1 py-3 text-sm font-medium ${insightsTab === 'likes' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
                                    onClick={() => setInsightsTab('likes')}
                                >
                                    Likes ({likeCount})
                                </button>
                            </div>

                            <div className="p-0 overflow-y-auto h-[50vh]">
                                {insightsTab === 'views' ? (
                                    <div className="flex flex-col">
                                        {story.story_views?.map((view: any, i: number) => (
                                            <div key={i} className="flex items-center gap-3 p-4 hover:bg-white/5">
                                                <Avatar>
                                                    <AvatarImage src={view.profiles?.avatar_url} />
                                                    <AvatarFallback>{view.profiles?.username?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-white text-sm font-medium">{view.profiles?.username}</span>
                                                    <span className="text-zinc-500 text-xs">
                                                        {new Date(view.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!story.story_views || story.story_views.length === 0) && (
                                            <div className="p-8 text-center text-zinc-500 text-sm">No views yet</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        {story.story_likes?.map((like: any, i: number) => (
                                            <div key={i} className="flex items-center gap-3 p-4 hover:bg-white/5">
                                                <Avatar>
                                                    <AvatarImage src={like.profiles?.avatar_url} />
                                                    <AvatarFallback>{like.profiles?.username?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-white text-sm font-medium">{like.profiles?.username}</span>
                                                    <span className="text-red-400 text-xs">
                                                        Likeds your story
                                                    </span>
                                                </div>
                                                <Heart className="h-4 w-4 text-red-500 fill-current ml-auto" />
                                            </div>
                                        ))}
                                        {(!story.story_likes || story.story_likes.length === 0) && (
                                            <div className="p-8 text-center text-zinc-500 text-sm">No likes yet</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>,
        document.body
    );
};

