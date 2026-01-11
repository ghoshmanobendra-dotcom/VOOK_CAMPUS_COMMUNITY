import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Community {
    id: string;
    name: string;
    image_url: string | null;
}

interface CommunitySidebarProps {
    communities: Community[];
    selectedCommunityId: string | null;
    onSelectCommunity: (community: any) => void;
    onAddGroup: () => void; // Keeping "Add Group" as requested, despite UI showing "Add Channel"
}

const CommunitySidebar = ({ communities, selectedCommunityId, onSelectCommunity, onAddGroup }: CommunitySidebarProps) => {
    return (
        <div className="w-80 bg-background border-r border-border flex flex-col h-full hidden md:flex">
            <div className="p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold font-['Outfit']">Communities</h2>
                {/* Optional: Filter or Add Community button here? Reference doesn't explicitly show one in header but lists usually have one */}
            </div>

            <ScrollArea className="flex-1 px-3">
                <div className="space-y-2">
                    {communities.map((comm) => (
                        <div
                            key={comm.id}
                            onClick={() => onSelectCommunity(comm)}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border border-transparent",
                                selectedCommunityId === comm.id
                                    ? "bg-muted border-border shadow-sm"
                                    : "hover:bg-muted/50"
                            )}
                        >
                            <Avatar className="h-10 w-10 rounded-lg border border-border/50">
                                <AvatarImage src={comm.image_url || undefined} />
                                <AvatarFallback className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                                    {comm.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h3 className={cn("font-medium truncate text-sm", selectedCommunityId === comm.id ? "text-foreground" : "text-muted-foreground")}>
                                    {comm.name}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Add Group Action (Matches "Add channel" position in reference) */}
            <div className="p-4 mt-auto">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-primary gap-2 hover:bg-primary/10 hover:text-primary"
                    onClick={onAddGroup}
                >
                    <Plus className="w-5 h-5" />
                    Add group
                </Button>
            </div>
        </div>
    );
};

export default CommunitySidebar;
