import { ArrowUp, MessageCircle, Share2, MoreHorizontal, Bookmark, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import TiltCard from "@/components/TiltCard";

export interface PostComment {
  id: string;
  author: string;
  avatar?: string;
  initials: string;
  content: string;
  timestamp: string;
}

export interface FeedPostData {
  id: string;
  author: {
    id?: string; // Optional to match PostContext
    name: string;
    avatar?: string;
    initials: string;
    college: string;
    username?: string; // Optional username for URL friendliness
  };
  communityTag?: string;
  isOfficial?: boolean;
  timestamp: string;
  content: string;
  images?: string[];
  hasVideo?: boolean;
  videoThumbnail?: string;
  upvotes: number;
  comments: number;
  isUpvoted?: boolean;
  isBookmarked?: boolean;
  previewComments?: PostComment[];
  poll?: {
    question: string;
    options: { text: string; percentage: number; isSelected?: boolean }[];
    totalVotes: number;
  };
  documents?: {
    name: string;
    size: string;
    url: string;
    type: string;
  }[];
}

interface FeedPostProps {
  post: FeedPostData;
  onUpvote?: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onClick?: (id: string) => void;
}

import { useNavigate } from "react-router-dom";

import CommentSection from "@/components/CommentSection";
import ShareModal from "@/components/ShareModal";
import PostLikesDisplay from "@/components/PostLikesDisplay";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const FeedPost = ({ post, onUpvote, onComment, onShare, onBookmark, onClick }: FeedPostProps) => {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.author.id) return; // Guard clause
    navigate(`/profile/${post.author.id}`);
  };

  return (
    <TiltCard
      className="bg-card rounded-xl border border-border p-4 hover:border-border/80 transition-colors cursor-pointer group"
      onClick={() => onClick?.(post.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleProfileClick}>
            <AvatarImage src={post.author.avatar} alt={post.author.name} />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
              {post.author.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className="font-semibold text-foreground cursor-pointer hover:underline decoration-primary"
                onClick={handleProfileClick}
              >
                {post.author.name}
              </span>
              {post.isOfficial && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-accent/20 text-accent border-0">
                  Official
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{post.author.college}</span>
              <span>•</span>
              <span>{post.timestamp}</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Community Tag */}
      {post.communityTag && (
        <div className="mb-3">
          <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">
            ● {post.communityTag}
          </Badge>
        </div>
      )}

      {/* Content */}
      <div className="text-foreground text-sm leading-relaxed mb-3 whitespace-pre-wrap">
        {post.content}
      </div>

      {/* Poll */}
      {post.poll && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>📊</span>
            <span>{post.poll.question}</span>
          </div>
          <div className="space-y-2">
            {post.poll.options.map((option, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative rounded-lg overflow-hidden",
                  option.isSelected ? "bg-primary/20" : "bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg",
                    option.isSelected ? "bg-primary/30" : "bg-muted/50"
                  )}
                  style={{ width: `${option.percentage}%` }}
                />
                <div className="relative flex justify-between items-center px-3 py-2">
                  <span className={cn("text-sm", option.isSelected && "text-primary font-medium")}>
                    {option.text}
                  </span>
                  <span className="text-xs text-muted-foreground">{option.percentage}%</span>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{post.poll.totalVotes} votes</p>
          </div>
        </div>
      )}

      {/* Documents */}
      {post.documents && post.documents.length > 0 && (
        <div className="mb-3 space-y-2">
          {post.documents.map((doc, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
              <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded flex items-center justify-center text-primary font-bold text-xs uppercase">
                {doc.type}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.size}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className={cn(
          "mb-3 rounded-lg overflow-hidden",
          post.images.length === 1 ? "" : "grid gap-1",
          post.images.length === 2 && "grid-cols-2",
          post.images.length >= 3 && "grid-cols-2"
        )}>
          {post.images.slice(0, 4).map((img, idx) => (
            <div
              key={idx}
              className={cn(
                "relative bg-muted aspect-video",
                post.images!.length === 1 && "aspect-video",
                post.images!.length >= 3 && idx === 0 && "col-span-2"
              )}
            >
              <img
                src={img}
                alt="Post image"
                className="w-full h-full object-cover"
              />
              {post.images!.length > 4 && idx === 3 && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <span className="text-foreground font-semibold">+{post.images!.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Video Thumbnail */}
      {post.hasVideo && post.videoThumbnail && (
        <div className="mb-3 relative rounded-lg overflow-hidden aspect-video bg-muted">
          <img
            src={post.videoThumbnail}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-background/80 flex items-center justify-center backdrop-blur-sm">
              <Play className="h-6 w-6 text-primary fill-primary ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Preview Comments */}
      {post.previewComments && post.previewComments.length > 0 && (
        <div className="mb-3 space-y-2 pl-2 border-l-2 border-border">
          {post.previewComments.slice(0, 2).map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={comment.avatar} alt={comment.author} />
                <AvatarFallback className="text-xs bg-muted">{comment.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="font-medium text-foreground">{comment.author}</span>
                  <span className="text-muted-foreground ml-1">{comment.content}</span>
                </p>
              </div>
            </div>
          ))}
          {post.comments > 2 && (
            <p className="text-xs text-muted-foreground pl-8">View all {post.comments} comments</p>
          )}
        </div>
      )}

      {/* Mutual Likes Summary */}
      <div className="px-1 mb-2">
        <PostLikesDisplay
          postId={post.id}
          initialCount={post.upvotes}
          initialIsLiked={!!post.isUpvoted}
        />
      </div>

      {/* Engagement Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 px-2 h-8",
              post.isUpvoted ? "text-destructive" : "text-muted-foreground hover:text-destructive"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onUpvote?.(post.id);
            }}
          >
            <ArrowUp className={cn("h-4 w-4", post.isUpvoted && "fill-destructive")} />
            <span className="text-sm">{post.upvotes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2 h-8 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              e.stopPropagation();
              setShowComments(true);
            }}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">{post.comments}</span>
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              post.isBookmarked ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onBookmark?.(post.id);
            }}
          >
            <Bookmark className={cn("h-4 w-4", post.isBookmarked && "fill-primary")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              setShowShare(true);
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Interactive Modals */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-xl h-[80vh] p-0 gap-0">
          <CommentSection postId={post.id} onClose={() => setShowComments(false)} />
        </DialogContent>
      </Dialog>

      <ShareModal
        open={showShare}
        onOpenChange={setShowShare}
        post={{
          id: post.id,
          authorName: post.author.name,
          content: post.content
        }}
      />
    </TiltCard>
  );
};

export default FeedPost;
