import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserCheck, UserPlus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Liker {
    user_id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    is_you: boolean;
    you_follow_them: boolean;
    they_follow_you: boolean;
    created_at: string;
}

interface LikesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    likers: Liker[];
}

const LikesModal = ({ open, onOpenChange, likers }: LikesModalProps) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("all");

    const mutuals = likers.filter(l => l.you_follow_them);

    // Helper to get list based on tab
    const getList = () => {
        if (activeTab === "mutual") return mutuals;
        return likers;
    };

    const handleUserClick = (userId: string) => {
        onOpenChange(false);
        navigate(`/profile/${userId}`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md h-[60vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b border-border">
                    <DialogTitle className="text-center">Likes</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="all" className="w-full flex-1 flex flex-col" onValueChange={setActiveTab}>
                    <div className="px-4 pt-2">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="all">All {likers.length}</TabsTrigger>
                            <TabsTrigger value="mutual">Following {mutuals.length}</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {getList().length === 0 ? (
                                <div className="text-center text-muted-foreground p-4">
                                    No likes in this category.
                                </div>
                            ) : getList().map((liker) => (
                                <div
                                    key={liker.user_id}
                                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                                    onClick={() => handleUserClick(liker.user_id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={liker.avatar_url} />
                                            <AvatarFallback>{liker.full_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm flex items-center gap-2">
                                                {liker.full_name}
                                                {liker.is_you && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">You</span>}
                                            </p>
                                            <p className="text-xs text-muted-foreground">@{liker.username}</p>
                                        </div>
                                    </div>

                                    {/* Connection Badge */}
                                    {!liker.is_you && (
                                        <div className="text-xs">
                                            {liker.you_follow_them && liker.they_follow_you ? (
                                                <span className="flex items-center gap-1 text-primary bg-primary/5 px-2 py-1 rounded-full font-medium">
                                                    <UserCheck className="h-3 w-3" /> Mutual
                                                </span>
                                            ) : liker.you_follow_them ? (
                                                <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                                                    <UserCheck className="h-3 w-3" /> Following
                                                </span>
                                            ) : liker.they_follow_you ? (
                                                <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full font-medium">
                                                    <UserPlus className="h-3 w-3" /> Follows you
                                                </span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default LikesModal;
