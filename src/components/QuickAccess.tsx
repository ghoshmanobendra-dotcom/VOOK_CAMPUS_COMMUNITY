import { Plus, History, BookOpen, Download } from "lucide-react";

const actions = [
  { icon: Plus, label: "New Post" },
  { icon: History, label: "History" },
  { icon: BookOpen, label: "Tutorials" },
  { icon: Download, label: "Export" },
];

const QuickAccess = () => {
  return (
    <section className="px-4">
      <h2 className="mb-3 font-display text-lg font-semibold">Quick Access</h2>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="group flex min-w-[100px] flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary hover:bg-primary/5"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="rounded-lg border border-border/50 p-3 transition-all duration-300 group-hover:border-primary group-hover:bg-primary/10">
                <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickAccess;
