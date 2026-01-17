import { ChevronLeft, Hash, Link as LinkIcon, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Group {
    id: string;
    name: string;
    image_url?: string | null;
    is_member?: boolean;
    member_count?: number;
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
    // Split groups into joined and not joined
    const joinedGroups = groups.filter(g => g.is_member);
    const unjoinedGroups = groups.filter(g => !g.is_member);

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
                <div className="space-y-6">

                    {/* SECTION 1: GROUPS YOU'RE IN */}
                    <div className="space-y-1">
                        <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            JOINED GROUPS
                        </h3>

                        {/* Add Group Action (Styled as a list item) */}
                        <div
                            onClick={onAddGroup}
                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-all border border-transparent group mb-2"
                        >
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm text-foreground">Add group</h3>
                            </div>
                        </div>

                        {joinedGroups.length === 0 && (
                            <div className="px-2 py-2 text-sm text-muted-foreground italic opacity-70">
                                You haven't joined any groups yet.
                            </div>
                        )}

                        {joinedGroups.map((group) => (
                            <div
                                key={group.id}
                                onClick={() => onSelectGroup(group)}
                                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-all border border-transparent group"
                            >
                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 border border-border/50 overflow-hidden text-muted-foreground">
                                    {group.image_url ? (
                                        <img src={group.image_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <Hash className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium truncate text-sm text-foreground group-hover:text-primary transition-colors">
                                        {group.name}
                                    </h3>
                                    {group.member_count !== undefined && (
                                        <p className="text-xs text-muted-foreground truncate opacity-70">
                                            {group.member_count} members
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SECTION 2: GROUPS YOU CAN JOIN */}
                    {unjoinedGroups.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-border/40">
                            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide my-2">
                                Groups you can join
                            </h3>

                            {unjoinedGroups.map((group) => (
                                <div
                                    key={group.id}
                                    // Clicking unjoined group - for now maybe just view or show toast, 
                                    // or ideally open in a "preview" mode. 
                                    // Based on prompt "listed downwards", let's make them clickable but visually distinct.
                                    onClick={() => onSelectGroup(group)}
                                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-all border border-transparent group opacity-90 hover:opacity-100"
                                >
                                    <div className="h-10 w-10 rounded-md bg-muted/50 flex items-center justify-center shrink-0 border border-border/50 overflow-hidden text-muted-foreground grayscale">
                                        {group.image_url ? (
                                            <img src={group.image_url} className="w-full h-full object-cover opacity-70" />
                                        ) : (
                                            <Hash className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium truncate text-sm text-foreground/80">
                                            {group.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                            {/* Simulate "Request to join" visually per screenshot */}
                                            <span>Request to join</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
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
