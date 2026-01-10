import { Eye, Heart } from "lucide-react";
import featured1 from "@/assets/featured-1.jpg";
import featured2 from "@/assets/featured-2.jpg";

const featuredPosts = [
  {
    id: 1,
    title: "Campus Connect",
    author: "Tech Society",
    image: featured1,
    views: "24.5K",
    likes: "1.2K",
    gradient: "from-accent/80 to-pink-500/60",
  },
  {
    id: 2,
    title: "Night Coders",
    author: "Dev Club",
    image: featured2,
    views: "18.7K",
    likes: "892",
    gradient: "from-secondary/80 to-blue-600/60",
  },
];

const FeaturedPosts = () => {
  return (
    <section className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Featured Posts</h2>
        <button className="text-sm text-primary hover:underline">See All</button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {featuredPosts.map((post, index) => (
          <div
            key={post.id}
            className="group relative min-w-[280px] cursor-pointer overflow-hidden rounded-xl"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t ${post.gradient} to-transparent opacity-80`} />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="font-display text-lg font-bold text-foreground drop-shadow-lg">
                {post.title}
              </h3>
              <p className="text-sm text-foreground/80">{post.author}</p>
              
              <div className="mt-2 flex items-center gap-3 text-xs text-foreground/90">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {post.views}
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                  {post.likes}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedPosts;
