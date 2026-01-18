
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Story, StoryGroup } from "@/components/story/types";
import { toast } from "sonner";

// Helper: Compress/Resize Image
const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image')) return file;
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200; // Good balance for stories
            const scale = MAX_WIDTH / img.width;
            if (scale >= 1) {
                resolve(file);
                return;
            }
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(new File([blob], file.name, { type: file.type }));
                    else resolve(file);
                }, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.8);
            } else {
                resolve(file);
            }
        };
        img.onerror = () => resolve(file);
    });
};

export const useStorySystem = () => {
    const [groupedStories, setGroupedStories] = useState<StoryGroup[]>([]);
    const [myStories, setMyStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Initial Auth Check
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setCurrentUserId(data.user.id);
        });
    }, []);

    const fetchStories = useCallback(async () => {
        if (!currentUserId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("stories")
                .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url),
          story_views (viewer_id, created_at, profiles:viewer_id (username, avatar_url)),
          story_likes (user_id, created_at, profiles:user_id (username, avatar_url))
        `)
                .gt("expires_at", new Date().toISOString())
                .order("created_at", { ascending: true });

            if (error) throw error;

            // Process Data
            const stories: Story[] = (data || []).map((s: any) => ({
                ...s,
                is_viewed: s.story_views.some((v: any) => v.viewer_id === currentUserId)
            }));

            // Separate My Stories vs Others
            const myOwn = stories.filter(s => s.user_id === currentUserId);
            const others = stories.filter(s => s.user_id !== currentUserId);

            setMyStories(myOwn);

            // Group Others by User
            const groups: Record<string, StoryGroup> = {};

            others.forEach(story => {
                if (!groups[story.user_id]) {
                    groups[story.user_id] = {
                        user_id: story.user_id,
                        username: story.profiles.username,
                        full_name: story.profiles.full_name,
                        avatar_url: story.profiles.avatar_url,
                        stories: [],
                        has_unseen: false,
                        latest_timestamp: story.created_at
                    };
                }
                groups[story.user_id].stories.push(story);
                if (!story.is_viewed) {
                    groups[story.user_id].has_unseen = true;
                }
                // Update latest timestamp if newer
                if (new Date(story.created_at) > new Date(groups[story.user_id].latest_timestamp)) {
                    groups[story.user_id].latest_timestamp = story.created_at;
                }
            });

            // To Array & Sort
            const sortedGroups = Object.values(groups).sort((a, b) => {
                // Algorithm: Unseen first, then latest time
                if (a.has_unseen && !b.has_unseen) return -1;
                if (!a.has_unseen && b.has_unseen) return 1;
                return new Date(b.latest_timestamp).getTime() - new Date(a.latest_timestamp).getTime();
            });

            setGroupedStories(sortedGroups);

        } catch (err) {
            console.error("Story Fetch Error", err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId]);

    // Realtime Subscription
    useEffect(() => {
        if (!currentUserId) return;

        fetchStories(); // Initial load

        const channel = supabase
            .channel("story-updates")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "stories" }, () => {
                fetchStories();
            })
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "stories" }, () => {
                fetchStories();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, fetchStories]);

    // Mark Viewed
    const markAsViewed = async (storyId: string) => {
        if (!currentUserId) return;
        try {
            await supabase.from("story_views").upsert(
                { story_id: storyId, viewer_id: currentUserId },
                { onConflict: "story_id,viewer_id", ignoreDuplicates: true }
            );
            // Local update to UI (Optimization)
            setGroupedStories(prev => prev.map(g => ({
                ...g,
                stories: g.stories.map(s => s.id === storyId ? { ...s, is_viewed: true } : s),
                has_unseen: g.stories.some(s => s.id !== storyId && !s.is_viewed) // Recalculate based on others
            })));
        } catch (e) {
            console.error("Failed to mark view", e);
        }
    };

    // Upload Stories (Multiple)
    const uploadStories = async (files: File[], caption: string, visibility: string) => {
        if (!currentUserId || files.length === 0) return;
        try {
            const uploadPromises = files.map(async (file) => {
                // Compress if image
                const processedFile = await compressImage(file);

                const fileExt = processedFile.name.split('.').pop();
                const filePath = `${currentUserId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(filePath, processedFile, { upsert: false });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

                // Insert one by one (or could do bulk insert if media_url was array, but schema is 1 row per story?)
                // Assuming 1 row per story based on schema
                // "stories" table likely has (id, media_url, ...)
                return supabase.from('stories').insert({
                    user_id: currentUserId,
                    media_url: publicUrl,
                    media_type: file.type.startsWith('video') ? 'video' : 'image',
                    caption: files.length === 1 ? caption : '', // Only apply caption to first if single, or all? user didn't specify. empty for bulk might be safer or apply to all.
                    visibility,
                    expires_at: expiresAt
                });
            });

            await Promise.all(uploadPromises);

            toast.success("Stories posted!");
            fetchStories(); // Refresh

        } catch (error) {
            console.error(error);
            toast.error("Failed to upload stories");
            throw error;
        }
    };

    const deleteStory = async (storyId: string) => {
        if (!currentUserId) return;
        try {
            const { error } = await supabase.from('stories').delete().eq('id', storyId).eq('user_id', currentUserId);
            if (error) throw error;
            toast.success("Story deleted");
            fetchStories();
        } catch (error) {
            console.error("Delete error", error);
            toast.error("Failed to delete story");
        }
    };

    return {
        stories: groupedStories,
        myStories,
        isLoading,
        currentUserId,
        markAsViewed,
        uploadStories,
        deleteStory,
        refreshStories: fetchStories
    };
};
