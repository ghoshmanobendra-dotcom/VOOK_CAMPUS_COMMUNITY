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
    userReaction?: string;
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
    communityId?: string;
    postType?: 'personal' | 'community';
}

interface PostContextType {
    posts: FeedPostData[];
    fetchPosts: (filter?: string) => Promise<void>;
    addPost: (post: Omit<FeedPostData, "id" | "timestamp" | "upvotes" | "comments">) => Promise<boolean>;
    toggleUpvote: (id: string) => Promise<void>;
    reactToPost: (id: string, type: string) => Promise<void>;
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
                    const meta = user.user_metadata;
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
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    const fetchPosts = async (filter: string = "all") => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            let query = supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (id, full_name, username, avatar_url, college),
                    post_likes!left(count),
                    post_comments!left(count)
                `)
                .order('created_at', { ascending: false });

            if (filter === "campus") {
                query = query.eq('community_tag', 'Campus Only');
            } else if (filter === "followers") {
                query = query.eq('community_tag', 'Followers only');
            }

            query = query.is('community_id', null);

            const { data: postsData, error } = await query;
            if (error) throw error;

            // Get User's Likes (My Likes) using post_likes table
            const myLikedPostIds = new Set<string>();
            if (user) {
                const { data: myLikes } = await supabase
                    .from('post_likes')
                    .select('post_id')
                    .eq('user_id', user.id);

                myLikes?.forEach(l => myLikedPostIds.add(l.post_id));
            }

            // Bookmarks (legacy logic kept for now)
            let userBookmarks: string[] = [];
            if (user) {
                const { data: bookmarksResult } = await supabase
                    .from('bookmarks')
                    .select('post_id')
                    .eq('user_id', user.id);
                if (bookmarksResult) userBookmarks = bookmarksResult.map(b => b.post_id);
            }


            const formattedPosts: FeedPostData[] = (postsData || []).map(p => {
                const isAnon = p.is_anonymous;
                const isOwnPost = user && user.id === p.user_id;
                // Supabase returns count as [{ count: n }] or similar depending on query
                const likeCount = p.post_likes?.[0]?.count || 0;
                const commentCount = p.post_comments?.[0]?.count || 0;

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
                    upvotes: likeCount, // Real Count from post_likes
                    comments: commentCount, // Real Count from post_comments
                    isUpvoted: myLikedPostIds.has(p.id),
                    userReaction: myLikedPostIds.has(p.id) ? '👍' : undefined, // simplified for now
                    isBookmarked: userBookmarks.includes(p.id),
                    previewComments: [],
                    postType: p.post_type || (p.community_id ? 'community' : 'personal'),
                    communityId: p.community_id
                };
            });

            setPosts(formattedPosts);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setIsLoading(false);
        }
    };

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
            .eq('receiver_id', user.id)
            .eq('is_read', false);
        setUnreadCount(count || 0);
    };

    // ... (lines 271-325 unchanged)

    const [unreadMessages, setUnreadMessages] = useState(0);

    const fetchUnreadMessageCount = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: myChats } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', user.id);

        const chatIds = myChats?.map(c => c.chat_id) || [];
        if (chatIds.length === 0) {
            setUnreadMessages(0);
            return;
        }

        let query = supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('chat_id', chatIds)
            .neq('sender_id', user.id)
            .is('read_at', null);

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
        fetchUserProfile();
        fetchPosts();
        fetchUnreadCount();
        fetchUnreadMessageCount();

        const postsChannel = supabase
            .channel('public:posts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                fetchPosts();
            })
            .subscribe();

        const notifChannel = supabase
            .channel('public:notifications_global')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
                const newNotif = payload.new as any;
                const { data: { user } } = await supabase.auth.getUser();
                if (user && (newNotif.receiver_id === user.id || newNotif.recipient_id === user.id)) {
                    setUnreadCount(prev => prev + 1);
                }
            })
            .subscribe();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                await fetchUserProfile();
                fetchPosts();
                fetchUnreadCount();
                fetchUnreadMessageCount();
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser({ name: "Guest", username: "@guest", initials: "G", college: "Campus", avatar: undefined });
                setIsAnonymousMode(false);
                setPosts([]);
            }
        });

        return () => {
            supabase.removeChannel(postsChannel);
            supabase.removeChannel(notifChannel);
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel('global_unread_messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
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
                community_id: newPostData.communityId,
                post_type: newPostData.postType || 'personal',
                is_official: false,
                is_anonymous: isAnonymousMode,
                created_at: new Date().toISOString(),
                upvotes: 0,
                comments_count: 0
            };

            const { error } = await supabase.from('posts').insert(postPayload);
            if (error) throw error;

            const isHomePost = !newPostData.communityTag || newPostData.communityTag === "Campus Only" || newPostData.communityTag === "Followers only";
            if (isHomePost) {
                await fetchPosts();
            }
            return true;
        } catch (error: any) {
            toast.error("Failed to create post: " + error.message);
            return false;
        }
    };

    const reactToPost = async (id: string, type: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please login to react");
                return;
            }

            const postIndex = posts.findIndex(p => p.id === id);
            if (postIndex === -1) return;
            const post = posts[postIndex];
            const currentReaction = post.userReaction;

            // Optimistic Update
            let newPosts = [...posts];

            if (currentReaction === type) {
                // Toggle OFF
                newPosts[postIndex] = {
                    ...post,
                    isUpvoted: false,
                    userReaction: undefined,
                    upvotes: Math.max(0, post.upvotes - 1)
                };
            } else {
                // Change or Add
                if (currentReaction) {
                    // Changing reaction (no vote count change)
                    newPosts[postIndex] = {
                        ...post,
                        isUpvoted: true,
                        userReaction: type
                    };
                } else {
                    // New reaction
                    newPosts[postIndex] = {
                        ...post,
                        isUpvoted: true,
                        userReaction: type,
                        upvotes: post.upvotes + 1
                    };
                }
            }
            setPosts(newPosts);

            // DB Update (Toggle based on existence)
            const { data: check } = await supabase
                .from("post_likes")
                .select("id")
                .eq("post_id", id)
                .eq("user_id", user.id);

            const existing = check && check.length > 0 ? check[0] : null;

            if (existing) {
                const { error } = await supabase
                    .from("post_likes")
                    .delete()
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("post_likes")
                    .insert({ post_id: id, user_id: user.id });
                if (error) throw error;
            }
            return;
        } catch (error) {
            console.error("Error reacting:", error);
            fetchPosts(); // Revert on error
        }
    };

    const toggleUpvote = async (id: string) => {
        // Alias for default like
        await reactToPost(id, '👍');
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

            setPosts(prev => prev.map(p => p.id === id ? { ...p, isBookmarked: !isBookmarked } : p));

            if (isBookmarked) {
                await supabase.from('bookmarks').delete()
                    .eq('user_id', user.id)
                    .eq('post_id', id)
                    .eq('is_anonymous', isAnonymousMode);
            } else {
                await supabase.from('bookmarks').insert({
                    user_id: user.id,
                    post_id: id,
                    is_anonymous: isAnonymousMode
                });
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
                reactToPost,
                toggleBookmark,
                currentUser: isAnonymousMode ? {
                    name: "Anonymous User",
                    username: "@anonymous",
                    avatar: undefined,
                    initials: "?",
                    college: "Hidden",
                    id: currentUser.id
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
