import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Heart, MoreHorizontal, Reply, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/context/PostContext";
import { formatDistanceToNow } from 'date-fns';
import { toast } from "sonner";
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    parent_id: string | null;
    author: {
        full_name: string;
        username: string;
        avatar_url: string;
    };
    replies?: Comment[];
}

interface CommentSectionProps {
    postId: string;
    onClose: () => void;
}

const CommentSection = ({ postId, onClose }: CommentSectionProps) => {
    const { currentUser } = usePosts();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEmoji, setShowEmoji] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .select(`
                    *,
                    author:user_id (full_name, username, avatar_url)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Organize into tree
            const commentMap = new Map();
            const roots: Comment[] = [];

            data.forEach((c: any) => {
                c.replies = [];
                commentMap.set(c.id, c);
            });

            data.forEach((c: any) => {
                if (c.parent_id) {
                    const parent = commentMap.get(c.parent_id);
                    if (parent) parent.replies.push(c);
                } else {
                    roots.push(c);
                }
            });

            setComments(roots.reverse()); // Newest first
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!newComment.trim()) return;

        // Ensure we have a valid user ID (fallback to auth if context is masked)
        let userId = currentUser?.id;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id;
        }

        if (!userId) {
            toast.error("You must be logged in to comment");
            return;
        }

        const content = newComment;
        setNewComment("");
        setReplyingTo(null);
        setShowEmoji(false);

        // Optimistic Update
        const tempId = "temp-" + Date.now();
        const optimisticComment: any = {
            id: tempId,
            content,
            created_at: new Date().toISOString(),
            user_id: userId,
            parent_id: replyingTo?.id || null,
            author: { // Use context name or fallback
                full_name: currentUser?.name || "You",
                username: currentUser?.username || "@you",
                avatar_url: currentUser?.avatar
            },
            replies: []
        };

        if (replyingTo) {
            setComments(prev => prev.map(c => {
                if (c.id === replyingTo.id) {
                    return { ...c, replies: [...(c.replies || []), optimisticComment] };
                }
                return c;
            }));
        } else {
            setComments(prev => [optimisticComment, ...prev]);
        }

        try {
            const { data, error } = await supabase
                .from('post_comments')
                .insert({
                    post_id: postId,
                    user_id: userId,
                    content,
                    parent_id: replyingTo?.id || null
                })
                .select(`
                    *,
                    author:user_id (full_name, username, avatar_url)
                `)
                .single();

            if (error) {
                console.error("Comment insert error:", error);
                throw error;
            }

            // Replace temp with real
            if (replyingTo) {
                setComments(prev => prev.map(c => {
                    if (c.id === replyingTo.id) {
                        return { ...c, replies: c.replies?.map(r => r.id === tempId ? data : r) };
                    }
                    return c;
                }));
            } else {
                setComments(prev => prev.map(c => c.id === tempId ? data : c));
            }

        } catch (err: any) {
            console.error("Failed to post comment:", err);
            toast.error("Failed to post: " + (err.message || "Unknown error"));
            // Revert changes
            fetchComments();
        }
    };

    const handleDelete = async (commentId: string) => {
        try {
            await supabase.from('post_comments').delete().eq('id', commentId);
            toast.success("Comment deleted");
            fetchComments();
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Comments</h3>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="text-center text-muted-foreground p-4">Loading...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center text-muted-foreground p-4">No comments yet. Be the first!</div>
                ) : (
                    <div className="space-y-6">
                        {comments.map(comment => (
                            <div key={comment.id} className="group">
                                <div className="flex gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.author?.avatar_url} />
                                        <AvatarFallback>{comment.author?.full_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="bg-muted/50 rounded-2xl p-3 rounded-tl-none">
                                            <div className="flex justify-between items-start">
                                                <span className="font-semibold text-sm">{comment.author?.full_name}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-1">{comment.content}</p>
                                        </div>
                                        <div className="flex text-xs text-muted-foreground gap-4 mt-1 ml-2">
                                            <button className="hover:text-foreground font-medium" onClick={() => setReplyingTo(comment)}>Reply</button>
                                            {currentUser?.id === comment.user_id && (
                                                <button className="hover:text-destructive" onClick={() => handleDelete(comment.id)}>Delete</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="ml-11 mt-3 space-y-3 pl-3 border-l-2 border-border/50">
                                        {comment.replies.map(reply => (
                                            <div key={reply.id} className="flex gap-3">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={reply.author?.avatar_url} />
                                                    <AvatarFallback>{reply.author?.full_name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="bg-muted/30 rounded-2xl p-2 rounded-tl-none">
                                                        <span className="font-semibold text-xs block">{reply.author?.full_name}</span>
                                                        <p className="text-xs">{reply.content}</p>
                                                    </div>
                                                    {currentUser?.id === reply.user_id && (
                                                        <button
                                                            className="text-[10px] text-muted-foreground hover:text-destructive ml-2"
                                                            onClick={() => handleDelete(reply.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
                {replyingTo && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 bg-muted/50 p-2 rounded-lg">
                        <span>Replying to <span className="font-semibold">{replyingTo.author.full_name}</span></span>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setReplyingTo(null)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                            className="pr-10"
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                            onClick={() => setShowEmoji(!showEmoji)}
                        >
                            <div className="scale-75">😊</div>
                        </Button>
                    </div>
                    <Button onClick={handleSubmit} size="icon" disabled={!newComment.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                {showEmoji && (
                    <div className="absolute bottom-20 right-4 z-50">
                        <EmojiPicker
                            onEmojiClick={(e) => {
                                setNewComment(prev => prev + e.emoji);
                                setShowEmoji(false);
                            }}
                            theme={Theme.AUTO}
                            width={300}
                            height={350}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentSection;
