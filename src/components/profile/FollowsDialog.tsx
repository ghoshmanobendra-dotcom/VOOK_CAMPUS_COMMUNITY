import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { UserCheck, UserPlus, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FollowsDialogProps {
    userId: string;
    username: string; // for title
    initialTab?: "followers" | "following";
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

interface UserListItem {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    is_following: boolean; // Am I following them?
    is_follower: boolean;  // Do they follow me? (for mutual check)
}

const FollowsDialog = ({ userId, username, initialTab = "followers", isOpen, onOpenChange }: FollowsDialogProps) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [initialTab, isOpen]);

    // Fetch data when tab or open changes
    useEffect(() => {
        if (isOpen && userId) {
            fetchUsers();
        }
    }, [isOpen, activeTab, userId]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) setCurrentUserId(currentUser.id);

            // 1. Get raw connections
            let rawData;
            if (activeTab === "followers") {
                const { data } = await supabase
                    .from('follows')
                    .select('follower_id, profiles!follows_follower_id_fkey(id, full_name, username, avatar_url)')
                    .eq('following_id', userId);

                // Map to flat structure
                rawData = data?.map((d: any) => d.profiles) || [];
            } else {
                const { data } = await supabase
                    .from('follows')
                    .select('following_id, profiles!follows_following_id_fkey(id, full_name, username, avatar_url)')
                    .eq('follower_id', userId);

                // Map to flat structure
                rawData = data?.map((d: any) => d.profiles) || [];
            }

            if (!currentUser) {
                setUsers(rawData.map((u: any) => ({ ...u, is_following: false, is_follower: false })));
                setLoading(false);
                return;
            }

            // 2. Check my relationships with these users (Bulk check)
            const idsToCheck = rawData.map((u: any) => u.id);

            if (idsToCheck.length === 0) {
                setUsers([]);
                setLoading(false);
                return;
            }

            // Who do I follow?
            const { data: myFollowing } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUser.id)
                .in('following_id', idsToCheck);

            const myFollowingSet = new Set(myFollowing?.map(f => f.following_id));

            // Who follows me? (optional, for mutual Logic if needed later)
            // For now, let's keep it simple.

            const enrichedUsers = rawData.map((u: any) => ({
                ...u,
                is_following: myFollowingSet.has(u.id),
                is_follower: false
            }));

            setUsers(enrichedUsers);

        } catch (error) {
            console.error("Error fetching follows:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async (targetUser: UserListItem) => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;

            if (targetUser.is_following) {
                // Unfollow
                const { error } = await supabase.from('follows').delete()
                    .eq('follower_id', currentUser.id)
                    .eq('following_id', targetUser.id);

                if (!error) {
                    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_following: false } : u));
                }
            } else {
                // Follow
                const { error } = await supabase.from('follows').insert({
                    follower_id: currentUser.id,
                    following_id: targetUser.id
                });

                if (!error) {
                    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_following: true } : u));
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 gap-0 bg-card border-border overflow-hidden">
                <DialogHeader className="p-4 border-b border-border/50">
                    <DialogTitle className="text-center text-lg">{username}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    <TabsList className="w-full rounded-none bg-muted/30 border-b border-border/50 p-0 h-10">
                        <TabsTrigger
                            value="followers"
                            className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            Followers
                        </TabsTrigger>
                        <TabsTrigger
                            value="following"
                            className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            Following
                        </TabsTrigger>
                    </TabsList>

                    <div className="p-2 border-b border-border/50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                className="pl-9 bg-muted/50 border-transparent focus:bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="h-[50vh] transition-all">
                        <div className="p-0">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-sm">Loading connections...</span>
                                </div>
                            ) : filteredUsers.length > 0 ? (
                                <div className="divide-y divide-border/30">
                                    {filteredUsers.map((user, idx) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <div
                                                className="flex items-center gap-3 cursor-pointer group"
                                                onClick={() => {
                                                    onOpenChange(false);
                                                    navigate(`/profile/${user.id}`);
                                                }}
                                            >
                                                <Avatar className="h-10 w-10 border border-border group-hover:scale-105 transition-transform">
                                                    <AvatarImage src={user.avatar_url} />
                                                    <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                                                        {user.username}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {user.full_name}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            {/* Don't show follow button for self */}
                                            {currentUserId && user.id !== currentUserId && (
                                                <Button
                                                    size="sm"
                                                    variant={user.is_following ? "outline" : "default"}
                                                    className={`h-8 px-3 text-xs ${user.is_following ? "border-muted-foreground/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" : ""}`}
                                                    onClick={() => handleFollowToggle(user)}
                                                >
                                                    {user.is_following ? (
                                                        "Following"
                                                    ) : (
                                                        <>
                                                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                                                            Follow
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                                    <UserCheck className="h-10 w-10 mb-2 opacity-20" />
                                    <p>No users found</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default FollowsDialog;
