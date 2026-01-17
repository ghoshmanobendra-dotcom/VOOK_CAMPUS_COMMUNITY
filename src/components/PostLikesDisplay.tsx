import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/context/PostContext";
import LikesModal, { Liker } from "./LikesModal";

interface PostLikesDisplayProps {
    postId: string;
    initialCount: number;
    initialIsLiked: boolean;
}

const PostLikesDisplay = ({ postId, initialCount, initialIsLiked }: PostLikesDisplayProps) => {
    const { currentUser } = usePosts();
    const [likers, setLikers] = useState<Liker[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Only fetch detail when hovering or if needed for preview?
    // For performance, we might fetch only a small subset initially OR wait for user interaction.
    // The prompt implies showing "User A, User B and X others".
    // Let's fetch the list on mount but simple limit? `get_post_likes_with_mutuals` orders by relevance.

    useEffect(() => {
        if (!currentUser?.id) return;
        // Fetch top likers for preview text
        // Note: For feed performance, this might be heavy if done for *every* post.
        // Ideally this should be part of the initial post fetch query, but we are enriching post-load for now.
        fetchLikers();
    }, [postId, currentUser?.id]);

    const fetchLikers = async () => {
        if (!currentUser?.id) return;
        try {
            // Using the RPC we created
            const { data, error } = await supabase.rpc('get_post_likes_with_mutuals', {
                p_post_id: postId,
                p_user_id: currentUser.id
            });

            if (!error && data) {
                setLikers(data as Liker[]);
            }
        } catch (e) {
            console.error("Failed to fetch likes detail", e);
        }
    };

    const formatText = () => {
        if (likers.length === 0) {
            return initialCount > 0 ? `${initialCount} likes` : "";
        }

        const youLiked = likers.some(l => l.is_you);
        const mutuals = likers.filter(l => l.you_follow_them && !l.is_you);
        const othersCount = Math.max(0, initialCount - (youLiked ? 1 : 0) - mutuals.length);

        if (mutuals.length > 0) {
            const firstName = mutuals[0].full_name.split(' ')[0]; // First name only for brevity?
            // "You, Friend and 5 others"
            const parts = [];
            if (youLiked) parts.push("You");
            parts.push(firstName);

            let text = `Liked by ${parts.join(", ")}`;
            if (mutuals.length > 1) {
                text += ` and ${mutuals.length - 1} other connection${mutuals.length > 2 ? 's' : ''}`; // Simplified
            }
            if (othersCount > 0) {
                // "Liked by You, Friend and 15 others"
                // Let's stick to prompt style: "User A, User B and 5 others"
                // Prioritize mutuals.
            }

            // Re-evaluating text logic based on standard patterns
            const namesToShow = mutuals.slice(0, 2).map(m => m.full_name);
            let display = "";

            if (namesToShow.length === 1) {
                display = `Liked by ${namesToShow[0]}`;
                if (othersCount + (youLiked ? 1 : 0) > 0) {
                    display += ` and ${othersCount + (youLiked ? 1 : 0)} others`;
                }
            } else if (namesToShow.length >= 2) {
                display = `Liked by ${namesToShow[0]}, ${namesToShow[1]} and ${Math.max(0, initialCount - 2)} others`;
            }

            return display;
        }

        if (youLiked) {
            if (initialCount === 1) return "You liked this";
            return `Liked by you and ${initialCount - 1} others`;
        }

        return `${initialCount} likes`;
    };

    if (initialCount === 0) return null;

    // Get mutual avatars for the stack
    const mutualAvatars = likers.filter(l => l.you_follow_them && !l.is_you).slice(0, 3);

    // If no mutuals, maybe show generic avatars if we have likers loaded?
    const displayAvatars = mutualAvatars.length > 0 ? mutualAvatars : likers.slice(0, 3);

    return (
        <>
            <div className="flex items-center gap-2 mt-2 cursor-pointer group" onClick={() => setShowModal(true)}>
                {displayAvatars.length > 0 && (
                    <div className="flex -space-x-2 mr-1">
                        {displayAvatars.map((l, i) => (
                            <img
                                key={l.user_id}
                                src={l.avatar_url || '/placeholder.png'}
                                className="w-5 h-5 rounded-full border border-background z-10"
                                style={{ zIndex: 3 - i }}
                                alt={l.username}
                            />
                        ))}
                    </div>
                )}
                <span className="text-xs text-muted-foreground group-hover:underline">
                    {formatText()}
                </span>
            </div>

            <LikesModal
                open={showModal}
                onOpenChange={setShowModal}
                likers={likers}
            />
        </>
    );
};

export default PostLikesDisplay;
