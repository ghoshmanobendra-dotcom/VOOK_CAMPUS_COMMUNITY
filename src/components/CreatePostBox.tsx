import { MapPin, Globe, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilterTab = "campus" | "all" | "trending" | "followers";

interface CreatePostBoxProps {
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
}

const CreatePostBox = ({ activeFilter, onFilterChange }: CreatePostBoxProps) => {
  const getButtonClass = (isActive: boolean) => cn(
    "rounded-full gap-2 px-4 transition-all duration-300",
    isActive
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
  );

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      <Button
        size="sm"
        className={getButtonClass(activeFilter === "campus")}
        onClick={() => onFilterChange("campus")}
      >
        <MapPin className="h-4 w-4" />
        Campus
      </Button>
      <Button
        size="sm"
        className={getButtonClass(activeFilter === "followers")}
        onClick={() => onFilterChange("followers")}
      >
        <Users className="h-4 w-4" />
        Followers only
      </Button>
      <Button
        size="sm"
        className={getButtonClass(activeFilter === "all")}
        onClick={() => onFilterChange("all")}
      >
        <Globe className="h-4 w-4" />
        All Posts
      </Button>
      <Button
        size="sm"
        className={getButtonClass(activeFilter === "trending")}
        onClick={() => onFilterChange("trending")}
      >
        <TrendingUp className="h-4 w-4" />
        Trending
      </Button>
    </div>
  );
};

export default CreatePostBox;
