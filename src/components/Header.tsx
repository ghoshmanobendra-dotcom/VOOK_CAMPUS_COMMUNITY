import { usePosts } from "@/context/PostContext";
import { Ghost } from "lucide-react";
import { VookLogo } from "./VookLogo";

const Header = () => {
  const { isAnonymousMode } = usePosts();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="scale-75 origin-left">
            <VookLogo size="small" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">VOOK</span>
        </div>

        {isAnonymousMode && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-muted-foreground animate-in fade-in slide-in-from-top-1">
            <Ghost className="h-4 w-4" />
            <span className="text-xs font-bold">Incognito</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
