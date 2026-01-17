import { useState, useEffect } from "react";
import { usePosts } from "@/context/PostContext";
import CommunityFeedPost from "./CommunityFeedPost";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { FeedPostData } from "@/context/PostContext"; // Reusing type or should import from a shared types file? FeedPostData is exported from PostContext.

interface CommunityFeedProps {
    communityId: string;
    communityName: string;
    filter?: 'all' | 'official' | 'regular';
}

const CommunityFeed = ({ communityId, communityName, filter = 'regular' }: CommunityFeedProps) => {
    const { currentUser } = usePosts(); // Only need user, not global posts
    const [posts, setPosts] = useState<FeedPostData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCommunityPosts = async () => {
        setIsLoading(true);
        console.log("Fetching community posts for:", communityName, communityId);
        try {
            // Fetch posts where community_id equals the community ID
            // Fallback to community_tag if needed handled by migration, here we strictly use ID for new standard
            let query = supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (id, full_name, username, avatar_url, college)
                `)
                .eq('community_id', communityId)
                .order('created_at', { ascending: false });

            if (filter === 'official') {
                query = query.eq('is_official', true);
            } else if (filter === 'regular') {
                query = query.eq('is_official', false);
            }

            const { data: postsData, error } = await query;

            if (error) throw error;

            // Fetch likes/bookmarks for this user within this context
            let userLikes: string[] = [];

            if (currentUser?.id) {
                const { data: likes } = await supabase
                    .from('likes')
                    .select('post_id')
                    .eq('user_id', currentUser.id)
                    .in('post_id', (postsData || []).map(p => p.id));

                if (likes) userLikes = likes.map(l => l.post_id);
            }

            const formattedPosts: FeedPostData[] = (postsData || []).map((p: any) => ({
                id: p.id,
                author: {
                    name: p.profiles?.full_name || "Unknown",
                    username: p.profiles?.username || "@unknown",
                    avatar: p.profiles?.avatar_url,
                    initials: (p.profiles?.full_name || "U")[0].toUpperCase(),
                    college: p.profiles?.college || "Campus",
                    id: p.profiles?.id
                },
                communityId: p.community_id,
                communityTag: p.community_tag,
                isOfficial: p.is_official,
                isAnonymous: p.is_anonymous,
                timestamp: new Date(p.created_at).toLocaleDateString(),
                content: p.content,
                images: p.image_urls,
                hasVideo: !!p.video_url,
                videoThumbnail: undefined,
                upvotes: p.upvotes || 0,
                comments: p.comments_count || 0,
                isUpvoted: userLikes.includes(p.id),
                isBookmarked: false, // Simplifying for now
                previewComments: [],
            }));

            setPosts(formattedPosts);

        } catch (error: any) {
            console.error("Error fetching community posts:", error);
            toast.error("Failed to load posts");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (communityId) {
            fetchCommunityPosts();
        }

        // Realtime Subscription SCOPED to this community
        const channel = supabase
            .channel(`community_posts:${communityId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'posts',
                    filter: `community_id=eq.${communityId}`
                },
                (payload) => {
                    console.log("Community Realtime Event:", payload);
                    fetchCommunityPosts(); // Brute force refresh for safety
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [communityId, filter]);

    const handleDelete = async (postId: string) => {
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
            toast.success("Post deleted");
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (error: any) {
            toast.error("Failed to delete: " + error.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
                <Users className="w-10 h-10 mb-3 opacity-20" />
                <p>No {filter === 'official' ? 'announcements' : 'community posts'} yet.</p>
                {filter === 'regular' && <p className="text-xs">Be the first to start a conversation!</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20">
            {posts.map(post => (
                <CommunityFeedPost
                    key={post.id}
                    post={post}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
};

export default CommunityFeed;
