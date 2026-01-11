import { ChevronLeft, ChevronRight, Hash, Link as LinkIcon, Users, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface Group {
    id: string;
    name: string;
    image_url?: string | null;
    member_count?: number;
    is_member?: boolean;
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
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Groups
                        </h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={onAddExistingGroup}
                            title="Add Group"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>

                    {groups.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center italic">
                            No groups yet
                        </div>
                    ) : (
                        groups.map((group) => {
                            const isMember = group.is_member !== false; // Default true if undefined

                            return (
                                <TooltipProvider key={group.id}>
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <div
                                                onClick={() => isMember && onSelectGroup(group)}
                                                className={cn(
                                                    "flex items-center gap-3 p-2 rounded-lg transition-all border border-transparent group relative select-none",
                                                    isMember
                                                        ? "cursor-pointer hover:bg-muted/50"
                                                        : "opacity-60 cursor-not-allowed bg-muted/20 grayscale-[0.8]"
                                                )}
                                            >
                                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 border border-border/50 overflow-hidden text-muted-foreground relative">
                                                    {group.image_url ? (
                                                        <img src={group.image_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Hash className="w-5 h-5" />
                                                    )}

                                                    {!isMember && (
                                                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                                            <Lock className="w-3 h-3 text-foreground" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <h3 className={cn(
                                                        "font-medium truncate text-sm transition-colors",
                                                        isMember ? "text-foreground group-hover:text-primary" : "text-muted-foreground"
                                                    )}>
                                                        {group.name}
                                                    </h3>
                                                    {group.member_count !== undefined && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {group.member_count} members
                                                        </p>
                                                    )}
                                                </div>

                                                {isMember ? (
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
                                                ) : (
                                                    <div className="sr-only">Locked</div>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        {!isMember && (
                                            <TooltipContent side="right">
                                                <p>You must be a member of this group to view it.</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-4 mt-auto border-t border-border/50 space-y-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground gap-2 hover:bg-muted hover:text-foreground"
                    onClick={onAddExistingGroup}
                >
                    <Users className="w-4 h-4" />
                    Add existing groups
                </Button>
            </div>
        </div>
    );
};

export default CommunitySidebar;
