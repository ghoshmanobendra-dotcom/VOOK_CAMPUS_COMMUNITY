
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FeedPost, { FeedPostData } from "@/components/FeedPost";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePosts } from "@/context/PostContext";
import { toast } from "sonner";

const PostDetails = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const { toggleUpvote, toggleBookmark } = usePosts();
    const [post, setPost] = useState<FeedPostData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            if (!postId) return;
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                const { data: postData, error } = await supabase
                    .from('posts')
                    .select(`
            *,
            profiles:user_id (id, full_name, username, avatar_url, college),
            post_likes (user_id),
            bookmarks (user_id)
          `)
                    .eq('id', postId)
                    .single();

                if (error) throw error;

                if (postData) {
                    const isUpvoted = postData.post_likes?.some((like: any) => like.user_id === user?.id);
                    const isBookmarked = postData.bookmarks?.some((bookmark: any) => bookmark.user_id === user?.id);

                    const formattedPost: FeedPostData = {
                        id: postData.id,
                        author: {
                            id: postData.profiles?.id,
                            name: postData.profiles?.full_name || "Unknown",
                            initials: (postData.profiles?.full_name || "U")[0],
                            college: postData.profiles?.college || "Campus",
                            avatar: postData.profiles?.avatar_url,
                            username: postData.profiles?.username
                        },
                        communityTag: postData.community_tag || (postData.community_id ? "Community" : undefined),
                        content: postData.content,
                        timestamp: new Date(postData.created_at).toLocaleDateString(),
                        upvotes: postData.upvotes || 0,
                        comments: postData.comments_count || 0,
                        isUpvoted,
                        isBookmarked,
                        images: postData.image_urls || [],
                        hasVideo: !!postData.video_url,
                        videoThumbnail: postData.video_thumbnail,
                        documents: postData.documents || [],
                        poll: postData.poll_data ? {
                            question: postData.poll_data.question,
                            options: postData.poll_data.options,
                            totalVotes: postData.poll_data.totalVotes || 0
                        } : undefined
                    };
                    setPost(formattedPost);
                }
            } catch (error) {
                console.error("Error fetching post:", error);
                toast.error("Post not found");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <main className="max-w-xl mx-auto py-4 px-4">
                {/* Back Header */}
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Post</h1>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : post ? (
                    <FeedPost
                        post={post}
                        onUpvote={toggleUpvote}
                        onBookmark={toggleBookmark}
                        onClick={() => { }} // Already on detail
                    />
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        Post not found or deleted.
                    </div>
                )}
            </main>
            <BottomNav />
        </div>
    );
};

export default PostDetails;
