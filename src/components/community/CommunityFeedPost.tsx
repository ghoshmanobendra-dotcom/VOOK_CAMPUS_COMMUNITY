import { useState, useEffect } from "react";
import { ArrowUp, MessageCircle, Share2, MoreHorizontal, Bookmark, Play, Trash2, Link as LinkIcon, Pin, Edit2, Send, X, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import TiltCard from "@/components/TiltCard";
import { FeedPostData, usePosts } from "@/context/PostContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface CommunityFeedPostProps {
    post: FeedPostData;
    onDelete?: (id: string) => void;
}

const CommunityFeedPost = ({ post, onDelete }: CommunityFeedPostProps) => {
    const { currentUser, toggleUpvote, toggleBookmark } = usePosts();
    const [isReplying, setIsReplying] = useState(false);
    const [isViewingConversation, setIsViewingConversation] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [comments, setComments] = useState<any[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSendingReply, setIsSendingReply] = useState(false);

    // Check ownership
    const isOwner = currentUser?.id === post.author.id;
    // For now assuming admin if owner of community, but safely just owner of post
    const canManage = isOwner;

    const fetchComments = async () => {
        setIsLoadingComments(true);
        try {
            const { data, error } = await supabase
                .from('comments')
                .select(`
                    id, 
                    content, 
                    created_at, 
                    user_id,
                    profiles:user_id ( full_name, username, avatar_url )
                `)
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });

            if (error) {
                // If table doesn't exist or other error, fallback safely
                console.error("Error fetching comments:", error);
            } else {
                setComments(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleReply = async () => {
        if (!replyContent.trim()) return;
        setIsSendingReply(true);
        try {
            const { error } = await supabase
                .from('comments')
                .insert({
                    post_id: post.id,
                    user_id: currentUser.id,
                    content: replyContent
                });

            if (error) throw error;

            toast.success("Reply posted");
            setReplyContent("");
            setIsReplying(false);

            // Refresh comments if open, or open them
            if (!isViewingConversation) {
                setIsViewingConversation(true);
            }
            fetchComments(); // Reload to see new comment

        } catch (error: any) {
            toast.error("Failed to reply: " + error.message);
        } finally {
            setIsSendingReply(false);
        }
    };

    const toggleConversation = () => {
        if (!isViewingConversation) {
            fetchComments();
        }
        setIsViewingConversation(!isViewingConversation);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        toast.success("Link copied to clipboard");
    };

    return (
        <div className="group rounded-xl bg-card border border-border/50 hover:border-border transition-all shadow-sm">
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-3">
                        <Avatar className="h-10 w-10 cursor-pointer">
                            <AvatarImage src={post.author.avatar} />
                            <AvatarFallback>{post.author.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm hover:underline cursor-pointer">
                                    {post.author.name}
                                </span>
                                {post.isOfficial && (
                                    <Badge variant="secondary" className="text-[10px] px-1 h-5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0">
                                        Owner
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">• {post.timestamp}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">{post.author.college}</div>
                        </div>
                    </div>

                    {/* Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={copyLink}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Copy link
                            </DropdownMenuItem>
                            {canManage && (
                                <>
                                    <DropdownMenuItem onClick={() => toast.info("Pinning coming seloon")}>
                                        <Pin className="w-4 h-4 mr-2" />
                                        Pin for everyone
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast.info("Editing coming soon")}>
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Edit post
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete?.(post.id)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Content */}
                <div className="pl-[52px]">
                    <div className="text-sm/relaxed whitespace-pre-wrap mb-3">
                        {post.content}
                    </div>

                    {/* Images */}
                    {post.images && post.images.length > 0 && (
                        <div className={cn(
                            "mb-3 rounded-lg overflow-hidden border border-border/50",
                            post.images.length === 1 ? "" : "grid gap-0.5",
                            post.images.length === 2 && "grid-cols-2",
                            post.images.length >= 3 && "grid-cols-2"
                        )}>
                            {post.images.slice(0, 4).map((img, idx) => (
                                <div key={idx} className={cn("relative bg-muted", post.images!.length === 1 ? "aspect-auto max-h-[500px]" : "aspect-square")}>
                                    <img src={img} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Reactions & Toolbar */}
                    <div className="flex items-center gap-4 mt-2">
                        {/* Reaction Hover Group */}
                        <div className="flex items-center gap-1 group/reactions relative">
                            {/* Hover Expansion - Pure CSS/Group based for speed */}
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover/reactions:flex bg-popover border border-border rounded-full p-1 shadow-lg animate-in fade-in slide-in-from-bottom-2 gap-1 z-10">
                                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => toggleUpvote(post.id)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-full text-lg transition-transform hover:scale-110"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("h-8 gap-1.5 px-2 text-muted-foreground hover:bg-muted/50", post.isUpvoted && "text-blue-500 bg-blue-500/10")}
                                onClick={() => toggleUpvote(post.id)}
                            >
                                <ArrowUp className={cn("w-4 h-4", post.isUpvoted && "fill-current")} />
                                <span className="text-xs font-medium">{post.upvotes > 0 ? post.upvotes : 'Like'}</span>
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-muted-foreground hover:bg-muted/50"
                            onClick={() => setIsReplying(!isReplying)}
                        >
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Reply</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-muted-foreground hover:bg-muted/50 ml-auto"
                            onClick={toggleConversation}
                        >
                            <span className="text-xs font-medium">
                                {isViewingConversation ? 'Hide conversation' : `View conversation ${post.comments > 0 ? `(${post.comments})` : ''}`}
                            </span>
                        </Button>
                    </div>

                    {/* Reply Input */}
                    {isReplying && (
                        <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{currentUser.initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 relative">
                                <Input
                                    autoFocus
                                    placeholder="Write a reply..."
                                    className="pr-10 bg-muted/30 border-muted-foreground/20"
                                    value={replyContent}
                                    onChange={e => setReplyContent(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReply();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleReply}
                                    disabled={!replyContent.trim() || isSendingReply}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 disabled:opacity-50 p-1"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Threaded View */}
                    {isViewingConversation && (
                        <div className="mt-4 space-y-4 pl-4 border-l-2 border-border/50 animate-in fade-in">
                            {isLoadingComments ? (
                                <div className="text-sm text-muted-foreground py-2">Loading replies...</div>
                            ) : comments.length > 0 ? (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={comment.profiles?.avatar_url} />
                                            <AvatarFallback>{comment.profiles?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="bg-muted/30 rounded-lg p-3 rounded-tl-none">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-xs">{comment.profiles?.full_name || 'Unknown'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-foreground/90">{comment.content}</p>
                                            </div>
                                            {/* Sub-actions for reply could go here */}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground py-2 italic">No replies yet. Be the first!</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityFeedPost;
