import tip1 from "@/assets/tip-1.jpg";
import tip2 from "@/assets/tip-2.jpg";

const tips = [
  {
    id: 1,
    title: "5 Essential Collaboration Techniques",
    description: "Improve your team's productivity with these expert tips...",
    image: tip1,
  },
  {
    id: 2,
    title: "Creating Perfect Content",
    description: "Learn how to craft posts that drive engagement...",
    image: tip2,
  },
];

const CommunityTips = () => {
  return (
    <section className="px-4 pb-24">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Community Tips</h2>
        <button className="text-sm text-primary hover:underline">See All</button>
      </div>

      <div className="flex flex-col gap-3">
        {tips.map((tip, index) => (
          <article
            key={tip.id}
            className="group flex cursor-pointer gap-4 rounded-xl border border-border bg-card p-3 transition-all duration-300 hover:border-primary/50 hover:bg-card-hover"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
              <img
                src={tip.image}
                alt={tip.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="font-display text-sm font-semibold leading-tight text-foreground">
                {tip.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {tip.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default CommunityTips;
