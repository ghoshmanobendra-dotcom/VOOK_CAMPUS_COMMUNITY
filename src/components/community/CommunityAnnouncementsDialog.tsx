import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Megaphone } from "lucide-react";
import CommunityFeedPost from "./CommunityFeedPost";
import { FeedPostData, usePosts } from "@/context/PostContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommunityAnnouncementsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: string;
    communityName: string;
}

const CommunityAnnouncementsDialog = ({ isOpen, onOpenChange, communityId, communityName }: CommunityAnnouncementsDialogProps) => {
    const { currentUser } = usePosts();
    const [posts, setPosts] = useState<FeedPostData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && communityId) {
            fetchAnnouncements();
        }
    }, [isOpen, communityId]);

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        try {
            const { data: postsData, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (id, full_name, username, avatar_url, college)
                `)
                .eq('community_id', communityId)
                .eq('is_official', true) // Only official/announcements
                .order('created_at', { ascending: false });

            if (error) throw error;

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
                isBookmarked: false,
                previewComments: [],
            }));

            setPosts(formattedPosts);

            // Mark as seen in local storage when opened
            if (formattedPosts.length > 0) {
                localStorage.setItem(`last_seen_announcements_${communityId}`, new Date().toISOString());
            }

        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Megaphone className="w-5 h-5 text-primary" />
                        Announcements
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 bg-muted/10 p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : posts.length > 0 ? (
                        <div className="space-y-4">
                            {posts.map(post => (
                                <CommunityFeedPost
                                    key={post.id}
                                    post={post}
                                    // Disable deletion in this view for simplicity, or add handler if needed
                                    onDelete={() => { }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Megaphone className="w-12 h-12 mb-4 opacity-20" />
                            <p>No announcements yet</p>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default CommunityAnnouncementsDialog;
