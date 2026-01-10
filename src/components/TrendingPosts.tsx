import { Clock } from "lucide-react";
import trending1 from "@/assets/trending-1.jpg";
import trending2 from "@/assets/trending-2.jpg";

const trendingPosts = [
  {
    id: 1,
    title: "Study Tips",
    subtitle: "Productivity Hacks",
    image: trending1,
    duration: "5 min read",
  },
  {
    id: 2,
    title: "Hackathon Prep",
    subtitle: "Code Together",
    image: trending2,
    duration: "8 min read",
  },
];

const TrendingPosts = () => {
  return (
    <section className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Trending Now</h2>
        <button className="text-sm text-primary hover:underline">See All</button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {trendingPosts.map((post) => (
          <div
            key={post.id}
            className="group min-w-[200px] cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Waveform visualization */}
              <div className="absolute bottom-2 left-2 right-2 flex items-end justify-center gap-0.5 opacity-80">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-primary"
                    style={{
                      height: `${Math.random() * 16 + 4}px`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="p-3">
              <h3 className="font-display font-semibold text-foreground">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground">{post.subtitle}</p>
              
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {post.duration}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrendingPosts;
