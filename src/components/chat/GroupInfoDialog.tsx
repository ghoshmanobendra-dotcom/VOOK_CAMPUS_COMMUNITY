import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, LogOut, Shield, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePosts } from "@/context/PostContext";
import { Input } from "@/components/ui/input";

interface GroupInfoDialogProps {
    chatId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Participant {
    user_id: string;
    role: string;
    joined_at: string;
    profile: {
        full_name: string;
        username: string;
        avatar_url: string;
    };
}

const GroupInfoDialog = ({ chatId, open, onOpenChange }: GroupInfoDialogProps) => {
    const { currentUser } = usePosts();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAddingMode, setIsAddingMode] = useState(false);

    // Search for adding members
    const [searchQuery, setSearchQuery] = useState("");
    const [foundUsers, setFoundUsers] = useState<any[]>([]);

    useEffect(() => {
        if (open && chatId) {
            fetchParticipants();
        }
    }, [open, chatId]);

    const fetchParticipants = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('chat_participants')
                .select(`
          user_id, role, joined_at,
          profile:user_id(full_name, username, avatar_url)
        `)
                .eq('chat_id', chatId);

            if (error) throw error;

            // Check my role
            const myParticipant = data.find((p: any) => p.user_id === currentUser?.id);
            setIsAdmin(myParticipant?.role === 'admin');

            setParticipants((data || []).map((p: any) => ({
                ...p,
                profile: Array.isArray(p.profile) ? p.profile[0] : p.profile
            })));
        } catch (err) {
            console.error("Error fetching participants:", err);
        } finally {
            setLoading(false);
        }
    };

    // Search logic (duplicate from CreateGroup, could be extracted)
    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim() || !currentUser?.id) {
                setFoundUsers([]);
                return;
            }

            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
                .limit(10);

            // Filter out existing participants
            const existingIds = new Set(participants.map(p => p.user_id));
            const filtered = data?.filter(u => !existingIds.has(u.id)) || [];
            setFoundUsers(filtered);
        };

        const timeout = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, participants]);

    const handleAddUser = async (user: any) => {
        try {
            const { error } = await supabase
                .from('chat_participants')
                .insert({
                    chat_id: chatId,
                    user_id: user.id,
                    role: 'member'
                });

            if (error) throw error;

            toast.success(`${user.full_name} added to group`);
            fetchParticipants();
            setSearchQuery("");
            setFoundUsers([]);
        } catch (err: any) {
            toast.error("Failed to add user");
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm("Are you sure you want to leave this group?")) return;
        try {
            const { error } = await supabase
                .from('chat_participants')
                .delete()
                .eq('chat_id', chatId)
                .eq('user_id', currentUser?.id);

            if (error) throw error;

            onOpenChange(false);
            window.location.reload(); // Force refresh to update chat list state
        } catch (err) {
            toast.error("Failed to leave group");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border max-w-sm mx-4 top-[20%]">
                <DialogHeader>
                    <DialogTitle className="text-foreground font-['Outfit'] text-xl">
                        Group Info
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Actions */}
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">{participants.length} Participants</p>
                        {isAdmin && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary/80"
                                onClick={() => setIsAddingMode(!isAddingMode)}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                {isAddingMode ? "Cancel" : "Add Participants"}
                            </Button>
                        )}
                    </div>

                    {/* Add Member Search Area */}
                    {isAddingMode && (
                        <div className="bg-muted/50 p-2 rounded-lg space-y-2">
                            <Input
                                placeholder="Search to add..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 text-sm"
                            />
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {foundUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer" onClick={() => handleAddUser(user)}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={user.avatar_url} />
                                                <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{user.full_name}</span>
                                        </div>
                                        <UserPlus className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-2">
                        {participants.map((p) => (
                            <div key={p.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={p.profile?.avatar_url} />
                                        <AvatarFallback>{p.profile?.full_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm text-foreground">
                                            {p.user_id === currentUser?.id ? "You" : p.profile?.full_name}
                                        </span>
                                        {p.role === 'admin' && (
                                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded w-fit flex items-center gap-1">
                                                <Shield className="h-3 w-3" /> Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="destructive"
                        className="w-full mt-4"
                        onClick={handleLeaveGroup}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Exit Group
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GroupInfoDialog;
