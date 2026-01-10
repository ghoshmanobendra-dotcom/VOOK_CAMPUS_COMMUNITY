import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, Camera, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePosts } from "@/context/PostContext";

interface CreateGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGroupCreated: () => void;
}

interface User {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
}

const CreateGroupDialog = ({ open, onOpenChange, onGroupCreated }: CreateGroupDialogProps) => {
    const { currentUser } = usePosts();
    const [step, setStep] = useState<1 | 2>(1); // 1: Select Members, 2: Group Details
    const [searchQuery, setSearchQuery] = useState("");
    const [foundUsers, setFoundUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [groupName, setGroupName] = useState("");
    const [groupImage, setGroupImage] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Reset state on close
    useEffect(() => {
        if (!open) {
            setStep(1);
            setSearchQuery("");
            setFoundUsers([]);
            setSelectedUsers([]);
            setGroupName("");
            setGroupImage(null);
            setPreviewImage(null);
            setIsCreating(false);
        }
    }, [open]);

    // Search Users
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
                .neq('id', currentUser.id)
                .limit(10);

            // Filter out already selected
            const filtered = data?.filter(u => !selectedUsers.find(s => s.id === u.id)) || [];
            setFoundUsers(filtered);
        };

        const timeout = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, currentUser?.id, selectedUsers]);

    const handleSelectUser = (user: User) => {
        setSelectedUsers([...selectedUsers, user]);
        setSearchQuery(""); // Clear search to show empty list or keep searching? Maybe clear.
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setGroupImage(file);
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || !currentUser?.id) return;
        setIsCreating(true);

        try {
            let avatarUrl = null;

            // 1. Upload Image if exists
            if (groupImage) {
                const fileName = `group-${Date.now()}-${groupImage.name}`;
                const { error: uploadError } = await supabase.storage.from('images').upload(fileName, groupImage);
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
                avatarUrl = urlData.publicUrl;
            }

            // 2. Create Chat entry
            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .insert({
                    type: 'group',
                    name: groupName,
                    image_url: avatarUrl,
                    created_by: currentUser.id
                })
                .select()
                .single();

            if (chatError) throw chatError;

            // 3. Add Participants (Me + Selected)
            const participants = [
                { chat_id: chatData.id, user_id: currentUser.id, role: 'admin' },
                ...selectedUsers.map(u => ({ chat_id: chatData.id, user_id: u.id, role: 'member' }))
            ];

            const { error: partError } = await supabase
                .from('chat_participants')
                .insert(participants);

            if (partError) throw partError;

            // 4. Send System Message (Optional)
            await supabase.from('messages').insert({
                chat_id: chatData.id,
                sender_id: currentUser.id,
                content: `Standard group "${groupName}" created.`,
                is_system_message: true // If supported, else normal message
            });

            toast.success("Group created successfully!");
            onGroupCreated();
            onOpenChange(false);

        } catch (err: any) {
            console.error("Error creating group:", err);
            toast.error("Failed to create group: " + err.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border max-w-sm mx-4 top-[20%]">
                <DialogHeader>
                    <DialogTitle className="text-foreground font-['Outfit'] text-xl">
                        {step === 1 ? "Add Participants" : "Group Info"}
                    </DialogTitle>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4 mt-2">
                        {/* Selected Users Chips */}
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedUsers.map(user => (
                                    <div key={user.id} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                                        <span>{user.full_name}</span>
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveUser(user.id)} />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search people..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-muted border-border focus:border-primary text-foreground"
                            />
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                            {foundUsers.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-foreground">{user.full_name}</span>
                                        <span className="text-xs text-muted-foreground">{user.username}</span>
                                    </div>
                                </div>
                            ))}
                            {searchQuery && foundUsers.length === 0 && (
                                <p className="text-center text-muted-foreground text-sm py-4">No users found.</p>
                            )}
                        </div>

                        <Button
                            className="w-full mt-4"
                            disabled={selectedUsers.length === 0}
                            onClick={() => setStep(2)}
                        >
                            Next
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 mt-4">
                        <div className="flex justify-center">
                            <div className="relative">
                                <Avatar className="h-24 w-24">
                                    {previewImage ? (
                                        <AvatarImage src={previewImage} className="object-cover" />
                                    ) : (
                                        <AvatarFallback className="bg-muted">
                                            <Users className="h-10 w-10 text-muted-foreground" />
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <label
                                    htmlFor="group-image"
                                    className="absolute bottom-0 right-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                                >
                                    <Camera className="h-4 w-4 text-primary-foreground" />
                                    <input
                                        type="file"
                                        id="group-image"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Group Subject</label>
                            <Input
                                placeholder="Type group subject here..."
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="bg-muted border-border focus:border-primary text-foreground"
                                maxLength={25}
                            />
                            <p className="text-xs text-end text-muted-foreground">{groupName.length}/25</p>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                Back
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleCreateGroup}
                                disabled={!groupName.trim() || isCreating}
                            >
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                                Create
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CreateGroupDialog;
