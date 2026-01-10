import { Crown, Edit3, Code2, Users2 } from "lucide-react";

const tools = [
  {
    icon: Crown,
    title: "Community Lead",
    description: "Lead discussions",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Edit3,
    title: "Chief Editor",
    description: "Curate content",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: Code2,
    title: "Tech Lead",
    description: "Share solutions",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users2,
    title: "Collaboration",
    description: "Work together",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

const CommunityTools = () => {
  return (
    <section className="px-4">
      <h2 className="mb-3 font-display text-lg font-semibold">Community Tools</h2>

      <div className="grid grid-cols-2 gap-3">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.title}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all duration-300 hover:border-primary/50 hover:bg-card-hover"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`rounded-lg p-2 ${tool.bgColor}`}>
                <Icon className={`h-5 w-5 ${tool.color}`} />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold">{tool.title}</h3>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CommunityTools;
