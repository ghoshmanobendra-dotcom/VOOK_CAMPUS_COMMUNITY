import { Plus, ChevronLeft, Hash, Link as LinkIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Group {
    id: string;
    name: string;
    image_url?: string | null;
}

interface CommunitySidebarProps {
    communityName: string;
    groups: Group[];
    onBack: () => void;
    onSelectGroup: (group: Group) => void;
    onAddGroup: () => void;
    onAddExistingGroup: () => void;
}

const CommunitySidebar = ({
    communityName,
    groups,
    onBack,
    onSelectGroup,
    onAddGroup,
    onAddExistingGroup
}: CommunitySidebarProps) => {
    return (
        <div className="w-80 bg-background border-r border-border flex flex-col h-full hidden md:flex">
            {/* Header: Back Button & Title */}
            <div className="p-4 flex flex-col gap-4 border-b border-border/50">
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 w-fit text-muted-foreground hover:text-foreground p-2 h-auto text-xs gap-1"
                    onClick={onBack}
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to all communities
                </Button>
                <h2 className="text-xl font-bold font-['Outfit'] truncate" title={communityName}>
                    {communityName}
                </h2>
            </div>

            {/* Groups List */}
            <ScrollArea className="flex-1 px-3 py-4">
                <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wide">
                        Groups
                    </h3>

                    {groups.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center italic">
                            No groups yet
                        </div>
                    ) : (
                        groups.map((group) => (
                            <div
                                key={group.id}
                                onClick={() => onSelectGroup(group)}
                                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-all border border-transparent group"
                            >
                                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 border border-border/50 overflow-hidden text-muted-foreground">
                                    {group.image_url ? (
                                        <img src={group.image_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <Hash className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium truncate text-sm text-foreground group-hover:text-primary transition-colors">
                                        {group.name}
                                    </h3>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-4 mt-auto border-t border-border/50 space-y-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-foreground gap-2 hover:bg-muted"
                    onClick={onAddGroup}
                >
                    <Plus className="w-4 h-4" />
                    Create new group
                </Button>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground gap-2 hover:bg-muted hover:text-foreground"
                    onClick={onAddExistingGroup}
                >
                    <LinkIcon className="w-4 h-4" />
                    Add existing group
                </Button>
            </div>
        </div>
    );
};

export default CommunitySidebar;
