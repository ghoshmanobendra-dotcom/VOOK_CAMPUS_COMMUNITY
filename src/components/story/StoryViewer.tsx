
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

export const StoryViewer = ({ stories, initialIndex = 0, onClose, onNextGroup, onPrevGroup, onView, currentUserId }: StoryViewerProps) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPaused, setIsPaused] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isLiked, setIsLiked] = useState(false);
    const story = stories[currentIndex];

    useEffect(() => {
        if (story) {
            onView(story.id);
            checkLikeStatus();
        }
    }, [story, currentIndex]);

    const checkLikeStatus = async () => {
        if (!story || !currentUserId) return;
        const { data } = await supabase.from('story_likes').select('id').eq('story_id', story.id).eq('user_id', currentUserId).maybeSingle();
        setIsLiked(!!data);
    }

    // Auto Advance
    useEffect(() => {
        if (isPaused || !story) return;

        const timer = setTimeout(() => {
            handleNext();
        }, 5000); // 5 seconds per story

        return () => clearTimeout(timer);
    }, [currentIndex, isPaused, story]);

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

    if (!story) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
            {/* Background Blur */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <img src={story.media_url} className="w-full h-full object-cover blur-3xl" alt="blur bg" />
            </div>

            {/* Content Container (Mobile Aspect Ratio) */}
            <div className="relative w-full max-w-md h-full md:h-[90vh] bg-zinc-900 md:rounded-xl overflow-hidden shadow-2xl flex flex-col">

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
                                        transition: isActive && !isPaused ? 'width 5s linear' : 'none'
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
                            <span className="text-sm font-semibold text-white shadowing">{story.profiles.username}</span>
                            {story.visibility === 'campus' && <span className="text-[10px] bg-white/20 px-1 rounded text-white self-start">Campus</span>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Owner controls could go here */}
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
                        <video src={story.media_url} className="w-full h-full object-contain" autoPlay muted playsInline />
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

                {/* Footer Interact */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-50 flex gap-3 items-center">
                    <form onSubmit={sendReply} className="flex-1">
                        <div className="relative">
                            <Input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                                placeholder="Send message..."
                                className="bg-transparent border-white/40 text-white placeholder:text-white/70 rounded-full h-10 pr-10 focus-visible:ring-0 focus-visible:border-white"
                            />
                            {/* Optional Send Icon if typing */}
                        </div>
                    </form>
                    {/* Like Button */}
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

            </div>
        </div>,
        document.body
    );
};
