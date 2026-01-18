
import { useState } from "react";
import { Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStorySystem } from "./useStorySystem";
import { usePosts } from "@/context/PostContext";
import { StoryViewer } from "./StoryViewer";
import { StoryComposer } from "./StoryComposer";
import { StoryGroup } from "./types";

export const StoryBar = () => {
    const { stories, myStories, currentUserId, markAsViewed, deleteStory } = useStorySystem();
    const { currentUser } = usePosts();
    const [viewingGroupIndex, setViewingGroupIndex] = useState<number | null>(null);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [viewingMyStories, setViewingMyStories] = useState(false);

    // Prepare active viewer data
    const activeGroup = viewingGroupIndex !== null ? stories[viewingGroupIndex] : null;

    const handleMyStoryClick = () => {
        if (myStories.length > 0) {
            setViewingMyStories(true);
        } else {
            setIsComposerOpen(true);
        }
    };

    const handleGroupClick = (index: number) => {
        setViewingGroupIndex(index);
    };

    const handleViewStory = (storyId: string) => {
        markAsViewed(storyId);
    };

    const handleNextGroup = () => {
        if (viewingGroupIndex !== null && viewingGroupIndex < stories.length - 1) {
            setViewingGroupIndex(viewingGroupIndex + 1);
        } else {
            setViewingGroupIndex(null);
        }
    };

    const handlePrevGroup = () => {
        if (viewingGroupIndex !== null && viewingGroupIndex > 0) {
            setViewingGroupIndex(viewingGroupIndex - 1);
        } else {
            setViewingGroupIndex(null);
        }
    };

    return (
        <div className="py-4 border-b border-white/5 bg-background">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max items-center space-x-4 px-4">

                    {/* My Story Node */}
                    <div className="flex flex-col items-center gap-1 cursor-pointer">
                        <div className="relative group" onClick={handleMyStoryClick}>
                            <div className={`p-[2px] rounded-full ${myStories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'bg-zinc-800'}`}>
                                <Avatar className="h-16 w-16 border-4 border-black">
                                    {/* Need current user avatar - context or fetch. Assuming hook returns userId, need profile logic..
                                        Actually hook doesn't return my Profile. 
                                        Let's assume generic or use simple fallback for "My Story" if profile not loaded yet.
                                     */}
                                    <AvatarFallback>{currentUser ? currentUser.initials : "Me"}</AvatarFallback>
                                    <AvatarImage src={currentUser?.avatar} />
                                </Avatar>
                            </div>
                            {myStories.length === 0 && (
                                <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-2 border-black">
                                    <Plus className="h-3 w-3 text-white" />
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-zinc-400">Your Story</span>
                    </div>

                    {/* Other Stories */}
                    {stories.map((group, idx) => (
                        <div key={group.user_id} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => handleGroupClick(idx)}>
                            <div className={`p-[3px] rounded-full transition-all ${group.has_unseen ? 'bg-gradient-to-tr from-yellow-400 via-orange-500 to-fuchsia-600 animate-[spin_10s_linear_infinite_paused] hover:animate-pulse' : 'bg-zinc-700'}`}>
                                <Avatar className="h-16 w-16 border-4 border-black">
                                    <AvatarImage src={group.avatar_url} />
                                    <AvatarFallback>{group.username[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                            <span className="text-xs text-zinc-400 max-w-[70px] truncate">{group.username}</span>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>

            {/* Viewer for Others */}
            {activeGroup && currentUserId && (
                <StoryViewer
                    stories={activeGroup.stories}
                    currentUserId={currentUserId}
                    onClose={() => setViewingGroupIndex(null)}
                    onNextGroup={handleNextGroup}
                    onPrevGroup={handlePrevGroup}
                    onView={handleViewStory}
                    // Start at first unseen logic?
                    initialIndex={activeGroup.stories.findIndex(s => !s.is_viewed) !== -1 ? activeGroup.stories.findIndex(s => !s.is_viewed) : 0}
                    deleteStory={deleteStory}
                />
            )}

            {/* Viewer for My Stories */}
            {viewingMyStories && currentUserId && (
                <StoryViewer
                    stories={myStories}
                    currentUserId={currentUserId}
                    onClose={() => setViewingMyStories(false)}
                    initialIndex={0}
                    onView={() => { }} // No view tracking for self
                    deleteStory={deleteStory}
                />
            )}

            {/* Composer */}
            <StoryComposer open={isComposerOpen} onOpenChange={setIsComposerOpen} />
        </div>
    );
};
