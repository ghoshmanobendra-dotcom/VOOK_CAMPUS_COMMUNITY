import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PostComment {
    id: string;
    author: string;
    avatar?: string;
    initials: string;
    content: string;
    timestamp: string;
}

export interface FeedPostData {
    id: string;
    author: {
        name: string;
        username: string;
        avatar?: string;
        initials: string;
        college: string;
        id?: string;
    };
    communityTag?: string;
    isOfficial?: boolean;
    isAnonymous?: boolean;
    timestamp: string;
    content: string;
    images?: string[];
    hasVideo?: boolean;
    videoThumbnail?: string;
    upvotes: number;
    comments: number;
    isUpvoted?: boolean;
    isBookmarked?: boolean;
    previewComments?: PostComment[];
    poll?: {
        question: string;
        options: { text: string; percentage: number; isSelected?: boolean }[];
        totalVotes: number;
    };
    documents?: {
        name: string;
        size: string;
        url: string;
        type: string;
    }[];
}

interface PostContextType {
    // ... (rest of interface remains same)
    posts: FeedPostData[];
    fetchPosts: (filter?: string) => Promise<void>;
    addPost: (post: Omit<FeedPostData, "id" | "timestamp" | "upvotes" | "comments">) => Promise<boolean>;
    toggleUpvote: (id: string) => Promise<void>;
    toggleBookmark: (id: string) => Promise<void>;
    currentUser: {
        name: string;
        username: string;
        avatar?: string;
        initials: string;
        college: string;
        id?: string;
    };
    isAnonymousMode: boolean;
    toggleAnonymousMode: () => void;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    unreadNotifications: number;
    markNotificationsAsRead: () => void;
    unreadMessages: number;
    refreshUnreadMessages: () => Promise<void>;
    markMessagesAsRead: () => void;
    activeChatId: string | null;
    setActiveChatId: (id: string | null) => void;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider = ({ children }: { children: ReactNode }) => {
    // ... (state and fetchUserProfile remain same)
    const [posts, setPosts] = useState<FeedPostData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnonymousMode, setIsAnonymousMode] = useState(false);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);

    // Default guest user
    const [currentUser, setCurrentUser] = useState<any>({
        name: "Guest",
        username: "@guest",
        initials: "G",
        college: "Campus",
        avatar: undefined
    });

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setCurrentUser({
                        name: profile.full_name || "User",
                        username: profile.username || "@user",
                        avatar: profile.avatar_url,
                        initials: (profile.full_name || "U")[0].toUpperCase(),
                        college: profile.college || "Campus",
                        id: user.id
                    });
                } else {
                    // Create profile if it doesn't exist (First time OAuth)
                    const meta = user.user_metadata;
                    // Robust check for name and avatar from various providers
                    const fullName = meta.full_name || meta.name || meta.user_name || "New User";
                    const avatarUrl = meta.avatar_url || meta.picture || meta.avatar || "";

                    const newProfile = {
                        id: user.id,
                        full_name: fullName,
                        username: (user.email?.split('@')[0] || fullName.replace(/\s+/g, '').toLowerCase() || "user") + "_" + user.id.slice(0, 4),
                        avatar_url: avatarUrl,
                        updated_at: new Date().toISOString(),
                    };

                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert(newProfile);

                    if (!insertError) {
                        setCurrentUser({
                            name: newProfile.full_name,
                            username: newProfile.username,
                            avatar: newProfile.avatar_url,
                            initials: (newProfile.full_name || "U")[0].toUpperCase(),
                            college: "Campus",
                            id: user.id
                        });
                    } else {
                        console.error("Profile creation failed:", insertError);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    // Updated fetchPosts with Filter Support
    const fetchPosts = async (filter: string = "all") => {
        console.log("fetchPosts called with filter:", filter);
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            let query = supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (id, full_name, username, avatar_url, college)
                `)
                .order('created_at', { ascending: false });

            // Apply Filter Logic
            if (filter === "campus") {
                query = query.eq('visibility', 'campus');
                // RLS enforces campus_id match, so we just ask for 'campus' type
            } else if (filter === "followers") {
                query = query.eq('visibility', 'followers');
            } else if (filter === "all") {
                // "Home" feed: Public posts OR "Campus Only" is hidden? 
                // Prompts says: "Campus-Only posts ... Never appear in Home"
                // So default/all = public only.
                query = query.eq('visibility', 'public');
            }
            // "trending" usually implies public/all sorted, handled by sort or same as 'all' for now.
            else if (filter === "trending") {
                query = query.eq('visibility', 'public'); // Improve later with sort
            }

            const { data: postsData, error } = await query;

            console.log("postsData length:", postsData?.length, "error:", error);
            if (error) throw error;

            // Fetch likes and bookmarks for current user (filtered by current mode)
            let userLikes: string[] = [];
            let userBookmarks: string[] = [];

            if (user) {
                const { data: likesResult } = await supabase
                    .from('likes')
                    .select('post_id')
                    .eq('user_id', user.id)
                    .eq('is_anonymous', isAnonymousMode);

                if (likesResult) userLikes = likesResult.map(l => l.post_id);

                const { data: bookmarksResult } = await supabase
                    .from('bookmarks')
                    .select('post_id')
                    .eq('user_id', user.id)
                    .eq('is_anonymous', isAnonymousMode);

                if (bookmarksResult) userBookmarks = bookmarksResult.map(b => b.post_id);
            }

            const formattedPosts: FeedPostData[] = (postsData || []).map(p => {
                const isAnon = p.is_anonymous;
                // ... mapping logic remains same ...
                const isOwnPost = user && user.id === p.user_id;

                return {
                    id: p.id,
                    author: isAnon ? {
                        name: "Anonymous User",
                        username: "@anonymous",
                        avatar: undefined,
                        initials: "?",
                        college: "Hidden",
                        id: isOwnPost ? p.user_id : undefined
                    } : {
                        name: p.profiles?.full_name || "Unknown",
                        username: p.profiles?.username || "@unknown",
                        avatar: p.profiles?.avatar_url,
                        initials: (p.profiles?.full_name || "U")[0].toUpperCase(),
                        college: p.profiles?.college || "Campus",
                        id: p.profiles?.id
                    },
                    communityTag: p.community_tag,
                    isOfficial: p.is_official,
                    isAnonymous: isAnon,
                    timestamp: new Date(p.created_at).toLocaleDateString(),
                    content: p.content,
                    images: p.image_urls,
                    hasVideo: !!p.video_url,
                    videoThumbnail: undefined,
                    upvotes: p.upvotes || 0,
                    comments: p.comments_count || 0,
                    isUpvoted: userLikes.includes(p.id),
                    isBookmarked: userBookmarks.includes(p.id),
                    previewComments: [],
                };
            });

            setPosts(formattedPosts);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch posts when mode changes to update like status
    useEffect(() => {
        fetchPosts();
    }, [isAnonymousMode]);

    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_id', user.id)
            .eq('is_read', false);
        setUnreadCount(count || 0);
    };

    const [unreadMessages, setUnreadMessages] = useState(0);

    const fetchUnreadMessageCount = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get my chats
        const { data: myChats } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', user.id);

        const chatIds = myChats?.map(c => c.chat_id) || [];

        if (chatIds.length === 0) {
            setUnreadMessages(0);
            return;
        }

        // 2. Count unread messages in those chats
        let query = supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('chat_id', chatIds)
            .neq('sender_id', user.id)
            .is('read_at', null);

        // Filter by last check time to support clearing badge locally
        const lastCheck = localStorage.getItem('lastChatCheck');
        if (lastCheck) {
            query = query.gt('created_at', lastCheck);
        }

        const { count } = await query;

        setUnreadMessages(count || 0);
    };

    const markMessagesAsRead = () => {
        setUnreadMessages(0);
        localStorage.setItem('lastChatCheck', new Date().toISOString());
    };

    const markNotificationsAsRead = () => {
        setUnreadCount(0);
    };

    useEffect(() => {
        // Initial fetch
        fetchUserProfile();
        fetchPosts();
        fetchUnreadCount();
        fetchUnreadMessageCount();

        const postsChannel = supabase
            .channel('public:posts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                console.log("Real-time post change detected, fetching posts");
                fetchPosts();
            })
            .subscribe();

        const notifChannel = supabase
            .channel('public:notifications_global')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                async (payload) => {
                    const newNotif = payload.new as any;
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && newNotif.recipient_id === user.id) {
                        setUnreadCount(prev => prev + 1);
                    }
                }
            )
            .subscribe();

        // Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                await fetchUserProfile();
                fetchPosts();
                fetchUnreadCount();
                fetchUnreadMessageCount();
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser({
                    name: "Guest",
                    username: "@guest",
                    initials: "G",
                    college: "Campus",
                    avatar: undefined
                });
                setIsAnonymousMode(false);
                setPosts([]); // Optional: clear posts or keep generic ones
            }
        });

        return () => {
            supabase.removeChannel(postsChannel);
            supabase.removeChannel(notifChannel);
            subscription.unsubscribe();
        };
    }, []);

    // Separate channel for messages to keep logic clean? Or combine?
    // Let's make a dedicated useEffect for message counting since it relies on auth heavily for chat_id list
    // Actually the above main subscriptions are fine, but for messages `postgres_changes` on 'messages' table is good.
    useEffect(() => {
        const channel = supabase
            .channel('global_unread_messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                // Brute force refresh for accuracy
                fetchUnreadMessageCount();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const toggleAnonymousMode = () => {
        setIsAnonymousMode(prev => !prev);
    };

    const addPost = async (newPostData: Omit<FeedPostData, "id" | "timestamp" | "upvotes" | "comments">): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("You must be logged in to post");
                return false;
            }

            const postPayload = {
                user_id: user.id,
                content: newPostData.content,
                image_urls: newPostData.images || [],
                community_tag: newPostData.communityTag,
                is_official: false,
                is_anonymous: isAnonymousMode,
                created_at: new Date().toISOString(),
                upvotes: 0,
                comments_count: 0
            };

            const { error } = await supabase
                .from('posts')
                .insert(postPayload);

            console.log("Insert post error:", error);
            if (error) throw error;

            // Refresh posts ONLY if it's a home/personal post
            // If it's a community post, we don't need to refresh the global feed
            const isHomePost = !newPostData.communityTag ||
                newPostData.communityTag === "Campus Only" ||
                newPostData.communityTag === "Followers only";

            console.log("Post inserted. isHomePost:", isHomePost);

            if (isHomePost) {
                await fetchPosts();
            }
            return true;

        } catch (error: any) {
            console.error("Error creating post:", error);
            toast.error("Failed to create post: " + error.message);
            return false;
        }
    };

    const toggleUpvote = async (id: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please login to like posts");
                return;
            }

            const postIndex = posts.findIndex(p => p.id === id);
            if (postIndex === -1) return;
            const post = posts[postIndex];
            const isCurrentlyUpvoted = post.isUpvoted;

            // Optimistic Update
            setPosts(prev => prev.map(p =>
                p.id === id
                    ? { ...p, isUpvoted: !isCurrentlyUpvoted, upvotes: p.upvotes + (isCurrentlyUpvoted ? -1 : 1) }
                    : p
            ));

            if (isCurrentlyUpvoted) {
                const { error } = await supabase.from('likes').delete().match({ user_id: user.id, post_id: id, is_anonymous: isAnonymousMode });
                if (error) throw error;

                const { error: decError } = await supabase.rpc('decrement_upvotes', { row_id: id });
                if (decError) console.error(decError);
            } else {
                const { error } = await supabase.from('likes').insert({ user_id: user.id, post_id: id, is_anonymous: isAnonymousMode });
                if (error) throw error;

                const { error: incError } = await supabase.rpc('increment_upvotes', { row_id: id });
                if (incError) console.error(incError);
            }
        } catch (error) {
            console.error("Error toggling vote:", error);
            fetchPosts();
        }
    };

    const toggleBookmark = async (id: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please login to bookmark posts");
                return;
            }

            const postIndex = posts.findIndex(p => p.id === id);
            if (postIndex === -1) return;
            const isBookmarked = posts[postIndex].isBookmarked;

            setPosts(prev => prev.map(p =>
                p.id === id
                    ? { ...p, isBookmarked: !isBookmarked }
                    : p
            ));

            if (isBookmarked) {
                await supabase.from('bookmarks').delete().match({ user_id: user.id, post_id: id, is_anonymous: isAnonymousMode });
            } else {
                await supabase.from('bookmarks').insert({ user_id: user.id, post_id: id, is_anonymous: isAnonymousMode });
            }
        } catch (error) {
            console.error("Error toggling bookmark:", error);
        }
    };

    return (
        <PostContext.Provider
            value={{
                posts,
                fetchPosts,
                addPost,
                toggleUpvote,
                toggleBookmark,
                currentUser: isAnonymousMode ? {
                    name: "Anonymous User",
                    username: "@anonymous",
                    avatar: undefined,
                    initials: "?",
                    college: "Hidden"
                } : currentUser,
                isAnonymousMode,
                toggleAnonymousMode,
                isLoading,
                refreshProfile: fetchUserProfile,
                unreadNotifications: unreadCount,
                markNotificationsAsRead,
                unreadMessages,
                refreshUnreadMessages: fetchUnreadMessageCount,
                markMessagesAsRead,
                activeChatId,
                setActiveChatId
            }}
        >
            {children}
        </PostContext.Provider>
    );
};

export const usePosts = () => {
    const context = useContext(PostContext);
    if (context === undefined) {
        throw new Error("usePosts must be used within a PostProvider");
    }
    return context;
};
