import { usePosts } from "@/context/PostContext";
import CommunityFeedPost from "./CommunityFeedPost";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CommunityFeedProps {
    communityName: string;
}

const CommunityFeed = ({ communityName }: CommunityFeedProps) => {
    const { posts, isLoading } = usePosts();

    // Filter posts for this community
    // Assuming communityTag is the community name for now as per `addPost` logic in PostEditor
    const communityPosts = posts.filter(p => p.communityTag === communityName);

    const handleDelete = async (postId: string) => {
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
            toast.success("Post deleted");
            // Realtime subscription should handle the removal from `posts` context
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

    if (communityPosts.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
                <p>No posts yet. Be the first to start a conversation!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20">
            {communityPosts.map(post => (
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
