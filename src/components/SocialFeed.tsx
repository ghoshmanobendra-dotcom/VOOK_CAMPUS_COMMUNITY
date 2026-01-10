
import FeedPost, { FeedPostData } from "./FeedPost";
import { usePosts } from "@/context/PostContext";
import { FilterTab } from "./CreatePostBox";

interface SocialFeedProps {
  filter?: FilterTab;
}

const SocialFeed = ({ filter = "all" }: SocialFeedProps) => {
  const { posts, toggleUpvote, toggleBookmark } = usePosts();

  const handlePostClick = (id: string) => {
    console.log("Open post:", id);
  };

  const filteredPosts = posts.filter(post => {
    if (filter === "campus") {
      // Show only Campus posts (Campus Only tag)
      return post.communityTag === "Campus Only";
    }
    if (filter === "followers") {
      // Show only Followers Only posts
      return post.communityTag === "Followers only";
    }
    if (filter === "trending") {
      // For now, trending just shows all, but sorted (sorting handled in render or backend usually)
      // Or maybe filter by logic (e.g. upvotes > 10)
      // User requested: "if we click on all posts then we will see all posts without any tagged problem"
      // Let's assume trending is just all for now, or maybe upvotes > 0
      return true;
    }
    // "all" - Show everything
    return true;
  });

  // Sort for trending if needed, otherwise default sort (time)
  const displayPosts = filter === "trending"
    ? [...filteredPosts].sort((a, b) => b.upvotes - a.upvotes)
    : filteredPosts;

  return (
    <div className="flex flex-col gap-4">
      {displayPosts.map((post) => (
        <FeedPost
          key={post.id}
          post={post}
          onUpvote={toggleUpvote}
          onBookmark={toggleBookmark}
          onClick={handlePostClick}
        />
      ))}
    </div>
  );
};

export default SocialFeed;
