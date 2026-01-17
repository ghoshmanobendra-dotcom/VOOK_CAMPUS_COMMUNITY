
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Settings, Edit2, BookOpen, Users, Award, Folder, Heart, Bookmark, Star, TrendingUp, Music, Film, Gamepad2, Mic, LogOut, Camera, ChevronDown, VolumeX, Ban, UserMinus, UserCheck, Star as StarIcon } from "lucide-react";
// ... imports


import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import featuredImg1 from "@/assets/featured-1.jpg";
import featuredImg2 from "@/assets/featured-2.jpg";
import trendingImg1 from "@/assets/trending-1.jpg";
import { usePosts } from "@/context/PostContext";
import FeedPost from "@/components/FeedPost";
import TiltCard from "@/components/TiltCard";
import { supabase } from "@/integrations/supabase/client";
import ProjectCard from "@/components/profile/ProjectCard";
import AddProjectDialog from "@/components/profile/AddProjectDialog";
import FollowsDialog from "@/components/profile/FollowsDialog";

// Add this helper function
const uploadImage = async (file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('images').getPublicUrl(filePath);
  return data.publicUrl;
};

const Profile = () => {
  const { posts, toggleUpvote, toggleBookmark, currentUser: ctxUser, isAnonymousMode, toggleAnonymousMode, refreshProfile } = usePosts();
  const navigate = useNavigate();
  const { state } = useLocation(); // Add hook
  const hasTrustedFollowState = state?.preCheckFollow !== undefined;
  const [activeTab, setActiveTab] = useState("posts");
  const { userId } = useParams();

  // Initialize from navigation state if available
  const [profile, setProfile] = useState<any>(state?.profile || null);
  const [isFollowsDialogOpen, setIsFollowsDialogOpen] = useState(false);
  const [followsDialogTab, setFollowsDialogTab] = useState<"followers" | "following">("followers");

  // Single Source of Truth Logic:
  // We NEVER trust navigation state for follow status. We always fetch from DB to ensure accuracy.

  // If we have profile data passed (e.g. from cache), we can show it, but we still treat relationship as loading.
  const isSelfInitial = ctxUser.id === state?.profile?.id || (!userId && ctxUser.id);

  // If it's not self, we are ALWAYS loading the relationship status initially
  const [isLoading, setIsLoading] = useState(!state?.profile);

  // Always start with false/null for others until verified by DB, but use trusted state if available
  const [isFollowing, setIsFollowing] = useState(state?.preCheckFollow ?? false);
  const [stats, setStats] = useState({
    posts: 0,
    followers: state?.profile?.followers || 0,
    following: state?.profile?.following || 0,
    upvotes: 0
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isOwnProfile = !userId || (profile && ctxUser.id === profile.id);

  const [mutuals, setMutuals] = useState<any[]>([]);
  const [loadingMutuals, setLoadingMutuals] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  // Story state
  const [hasStory, setHasStory] = useState(false);

  const handleAvatarClick = () => {
    if (hasStory) {
      setIsAvatarDialogOpen(true);
    } else {
      if (profile.avatar_url) window.open(profile.avatar_url, '_blank');
    }
  };

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: state?.profile?.full_name || "",
    username: state?.profile?.username || "",
    bio: state?.profile?.bio || "",
    department: state?.profile?.department || "",
    college: state?.profile?.college || "",
    passOutYear: state?.profile?.passout_year || "",
    avatar: state?.profile?.avatar_url || "",
    backgroundImage: state?.profile?.background_url || null
  });

  // New state to hold files to upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const fetchProjects = async () => {
    if (!profile?.id) return;
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUserProjects(data);
    }
    setLoadingProjects(false);
  };

  useEffect(() => {
    if (profile?.id) {
      fetchProjects();
    }
  }, [profile?.id]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // Fetch Profile Data
  useEffect(() => {
    const fetchProfileData = async () => {
      // Only show top loading bar if we don't have profile data yet
      if (!profile) setIsLoading(true);

      try {
        let targetId = userId;

        // If no userId param, or it matches current user, use current session
        if (!targetId) {
          // Optimization: Use context user ID if available to skip one network call
          if (ctxUser && ctxUser.id) {
            targetId = ctxUser.id;
          } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) targetId = user.id;
          }
        }

        if (targetId) {
          const { data: { user } } = await supabase.auth.getUser();
          const isSelf = user && targetId === user.id;

          if (isSelf && isAnonymousMode) {
            // SHOW ANONYMOUS PROFILE
            setProfile({
              id: user.id,
              full_name: "Anonymous User",
              username: "@anonymous",
              bio: "You are in Anonymous Mode. Your identity is hidden.",
              avatar_url: null,
              background_url: null,
              college: "Hidden",
              department: "Hidden",
              passout_year: ""
            });

            // Fetch stats for ANONYMOUS posts only
            const { count: postCount } = await supabase.from('posts').select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_anonymous', true);

            setStats({
              posts: postCount || 0,
              followers: 0,
              following: 0,
              upvotes: 0
            });
          } else {
            // SHOW REAL PROFILE
            let query = supabase.from('profiles').select('*');
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

            if (targetId.startsWith('@')) {
              query = query.eq('username', targetId);
            } else if (isUUID) {
              query = query.eq('id', targetId);
            } else {
              query = query.eq('username', targetId);
            }

            const { data: profileData, error } = await query.single();

            if (profileData) {
              setProfile(profileData);
              // Only reset form if blank
              if (!editForm.name) {
                setEditForm({
                  name: profileData.full_name || "",
                  username: profileData.username || "",
                  bio: profileData.bio || "",
                  department: profileData.department || "",
                  college: profileData.college || "",
                  passOutYear: profileData.passout_year || "",
                  avatar: profileData.avatar_url || "",
                  backgroundImage: profileData.background_url || null
                });
              }

              const { count: postCount } = await supabase
                .from('posts')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', profileData.id)
                .eq('is_anonymous', false);

              setStats({
                posts: postCount || 0,
                followers: profileData.followers || 0,
                following: profileData.following || 0,
                upvotes: (postCount || 0) * 5
              });

              // Unified Resolver: Always ensures follow status is fetched if not explicitly trusted
              if (user && user.id !== profileData.id) {
                // Fetch fresh from DB (Canonical Source)
                console.log(`Checking follow status: Viewer(${user.id}) -> Profile(${profileData.id})`);

                // Hybrid Approach:
                // If we have trusted state and the ID matches, use it.
                // Otherwise, verify with DB
                if (hasTrustedFollowState && state?.profile?.id === profileData.id) {
                  console.log(`Using trusted follow state: ${state.preCheckFollow}`);
                  setIsFollowing(state.preCheckFollow);
                } else {
                  console.log("Fetching fresh follow status from DB");
                  const { count, error } = await supabase.from('follows').select('*', { count: 'exact', head: true })
                    .eq('follower_id', user.id)
                    .eq('following_id', profileData.id);

                  console.log(`DB Follow check: follower_id=${user.id}, following_id=${profileData.id}, count=${count}, error=${error?.message}`);

                  if (error) {
                    console.error("Follow check failed:", error);
                  }

                  setIsFollowing(!!count);
                  console.log(`Follow status set to: ${!!count}`);
                }
              }

              // Check for active stories (valid for 24h)
              const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              const { count: storyCount } = await supabase
                .from('stories')
                .select('id', { count: 'exact', head: true }) // count instead of SELECT *
                .eq('user_id', profileData.id)
                .gt('created_at', twentyFourHoursAgo);

              setHasStory(!!storyCount && storyCount > 0);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [userId, ctxUser.id, isEditing]); // Re-fetch on edit close to refresh

  const fetchMutuals = async (targetId: string) => {
    try {
      setLoadingMutuals(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get IDs I follow
      const { data: myFollowing } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!myFollowing || myFollowing.length === 0) {
        setLoadingMutuals(false);
        return;
      }

      const myFollowingIds = myFollowing.map(f => f.following_id);

      // 2. Find which of them follow the target
      // Supabase doesn't support generic 'INTERSECT' easily in one line without RPC, 
      // so we query for followers of target IN myFollowingIds
      const { data: mutualFollows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', targetId)
        .in('follower_id', myFollowingIds)
        .limit(3); // Just get 3 for the preview

      if (mutualFollows && mutualFollows.length > 0) {
        const mutualIds = mutualFollows.map(m => m.follower_id);
        const { data: mutualProfiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, full_name')
          .in('id', mutualIds);

        setMutuals(mutualProfiles || []);
      }
    } catch (error) {
      console.error("Error fetching mutuals", error);
    } finally {
      setLoadingMutuals(false);
    }
  };

  // Fetch mutuals when profile is loaded and it is NOT own profile
  useEffect(() => {
    if (profile && !isOwnProfile) {
      fetchMutuals(profile.id);
    }
  }, [profile, isOwnProfile]);

  const handleFollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) return;

      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true);
      setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      toast.success("Following");
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleUnfollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) return;

      // Optimistic update
      setIsFollowing(false);
      setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      setIsDrawerOpen(false); // Close drawer immediately
      toast.success("Unfollowed");

      const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id);

      if (error) {
        // Revert if failed
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        toast.error("Action failed");
        console.error(error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    navigate('/chats', {
      state: {
        startChatWith: {
          id: profile.id,
          name: profile.full_name,
          initials: (profile.full_name || "U")[0],
          color: "hsl(var(--primary))",
          lastMessage: "Start a conversation",
          time: "Now",
          isOnline: true
        }
      }
    });
    toast.success(`Opened chat with ${profile.full_name}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'backgroundImage') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Update preview immediately
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditForm(prev => ({ ...prev, [field]: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);

      // Store file for upload on save
      if (field === 'avatar') setAvatarFile(file);
      if (field === 'backgroundImage') setBackgroundFile(file);
    }
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let avatarUrl = editForm.avatar;
        let backgroundUrl = editForm.backgroundImage;

        // Upload new files if selected
        if (avatarFile) {
          try {
            avatarUrl = await uploadImage(avatarFile);
          } catch (e) {
            console.error("Avatar upload failed", e);
            toast.error("Failed to upload avatar");
            setIsSaving(false);
            return;
          }
        }

        if (backgroundFile) {
          try {
            backgroundUrl = await uploadImage(backgroundFile);
          } catch (e) {
            console.error("Background upload failed", e);
            toast.error("Failed to upload background image");
            setIsSaving(false);
            return;
          }
        }

        const updates = {
          id: user.id,
          full_name: editForm.name,
          username: editForm.username,
          department: editForm.department,
          college: editForm.college,
          passout_year: editForm.passOutYear,
          bio: editForm.bio,
          avatar_url: avatarUrl,
          background_url: backgroundUrl,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('profiles').upsert(updates);
        if (error) throw error;

        setProfile((prev: any) => ({ ...prev, ...updates }));

        // Refresh global context to update header/feed immediately
        await refreshProfile();

        // Clear file states
        setAvatarFile(null);
        setBackgroundFile(null);

        setIsEditing(false);
        toast.success("Profile updated!");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to save changes: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const displayedPosts = posts.filter(p => {
    if (!profile) return false;
    // When viewing own profile (no userId param or matching ID)
    if (isOwnProfile) {
      // If Anonymous Mode is ON: Show ONLY my anonymous posts
      if (isAnonymousMode) {
        return p.author.id === profile.id && p.isAnonymous;
      }
      // If Anonymous Mode is OFF: Show ONLY my public posts
      return p.author.id === profile.id && !p.isAnonymous;
    }
    // When viewing others: Show their public posts (Context already masks anonymous ones, so ID will mismatch anyway)
    // When viewing others: Show their public posts
    // Filter out community posts (communityId or post_type check)
    if (p.communityId || p.postType === 'community') return false;

    return p.author.id === profile.id;
  });
  const savedPosts = posts.filter(p => p.isBookmarked);

  // Removed mock projects


  const achievements = [
    { id: 1, title: "Top Creator", icon: Star, color: "text-foreground" },
    { id: 2, title: "Community Leader", icon: Users, color: "text-foreground" },
    { id: 3, title: "Trendsetter", icon: TrendingUp, color: "text-foreground" },
  ];

  const badges = [
    { id: 1, name: "Early Adopter", color: "bg-primary" },
    { id: 2, name: "Verified", color: "bg-primary" },
  ];

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading Profile...</div>;
  }

  if (!profile && !isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Profile not found.</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header / Banner */}
      <div className="relative group">
        <div
          className="h-32 bg-cover bg-center transition-all duration-500 bg-muted"
          style={{
            backgroundImage: profile.background_url
              ? `url(${profile.background_url})`
              : undefined
          }}
        />
        <div className="absolute inset-0 bg-black/20" />


        {isOwnProfile && (
          <div className="absolute right-4 top-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <DropdownMenuItem className="cursor-pointer hover:bg-muted" onClick={() => toggleAnonymousMode()}>
                  {isAnonymousMode ? (
                    <span className="text-primary font-bold flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      Anonymous Mode On
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-foreground">
                      Enable Anonymous Mode
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500 cursor-pointer hover:bg-muted" onClick={async () => {
                  await supabase.auth.signOut();
                  toast.success("Logged out successfully");
                  navigate("/login");
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="flex items-end gap-4">
          <div onClick={handleAvatarClick} className="cursor-pointer relative">
            <div className={`rounded-full p-[3px] ${hasStory ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : 'bg-transparent'}`}>
              <Avatar className="h-24 w-24 border-4 border-background bg-background">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                <AvatarFallback className="text-2xl bg-muted text-foreground">{(profile.full_name || "U")[0]}</AvatarFallback>
              </Avatar>
            </div>
          </div>

          <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
            <DialogContent className="sm:max-w-sm bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-center">{profile.username}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full justify-start font-semibold text-lg py-6" variant="ghost"
                  onClick={() => {
                    // Navigate to home with state to open story
                    navigate('/', { state: { openStoryForUser: profile.username } });
                  }}
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-tr from-yellow-500 to-purple-500">
                    View Story
                  </span>
                </Button>
                <Button className="w-full justify-start font-medium py-6" variant="ghost" onClick={() => window.open(profile.avatar_url, '_blank')}>
                  See Profile Photo
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isOwnProfile ? (
            <Button size="sm" variant="outline" className="mb-2 gap-2 border-border hover:bg-muted text-foreground" onClick={() => {
              setIsEditing(true);
            }}>
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2 mb-2">
              {isFollowing ? (
                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-1">
                      Following <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="bg-card border-border">
                    <div className="mx-auto w-full max-w-sm">
                      <DrawerHeader className="border-b border-border/10 pb-4">
                        <DrawerTitle className="text-center font-bold text-lg text-foreground">{profile?.username}</DrawerTitle>
                        <DrawerDescription className="text-center text-xs text-muted-foreground">Manage your connection</DrawerDescription>
                      </DrawerHeader>
                      <div className="p-4 space-y-1">

                        <Button variant="ghost" className="w-full justify-start hover:bg-red-500/10 text-red-500 font-medium h-12 mt-2" onClick={handleUnfollow}>
                          Unfollow
                        </Button>

                      </div>
                      <div className="h-4"></div>
                    </div>
                  </DrawerContent>
                </Drawer>
              ) : (
                <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleFollow}>
                  Follow
                </Button>
              )}
              <Button size="sm" variant="outline" className="border-border hover:bg-muted text-foreground" onClick={handleMessage}>
                Message
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
          <p className="text-muted-foreground">{profile.username}</p>
          <p className="text-sm mt-1 text-foreground/80">{profile.bio || "No bio yet."}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {profile.department && <span>{profile.department}</span>}
            {profile.department && <span>•</span>}
            {profile.college && <span>{profile.college}</span>}
            {profile.passout_year && (
              <>
                <span>•</span>
                <span>Class of {profile.passout_year}</span>
              </>
            )}
          </div>
        </div>

        {/* Mutual Followers Section */}
        {!isOwnProfile && mutuals.length > 0 && (
          <div className="mt-4 mb-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex pl-2">
              {mutuals.map((m, i) => (
                <Avatar
                  key={m.id}
                  className={`h-6 w-6 border-2 border-background ml-[-10px] first:ml-0 z-[${10 - i}] cursor-pointer hover:scale-110 transition-transform`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${m.id}`);
                  }}
                >
                  <AvatarImage src={m.avatar_url} />
                  <AvatarFallback className="text-[8px]">{m.username[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Followed by <span className="font-semibold text-foreground">{mutuals[0].username}</span>
              {mutuals.length > 1 && (
                <>
                  {mutuals.length === 2 ? (
                    <> and <span className="font-semibold text-foreground">{mutuals[1].username}</span></>
                  ) : (
                    <>, <span className="font-semibold text-foreground">{mutuals[1].username}</span> and others</>
                  )}
                </>
              )}
            </p>
          </div>
        )}


        {/* Stats Row */}
        <div className="mt-4 flex gap-6">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{stats.posts}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div
            className="text-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              setFollowsDialogTab("followers");
              setIsFollowsDialogOpen(true);
            }}
          >
            <p className="text-xl font-bold text-foreground">{stats.followers}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div
            className="text-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              setFollowsDialogTab("following");
              setIsFollowsDialogOpen(true);
            }}
          >
            <p className="text-xl font-bold text-foreground">{stats.following}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>
      </div>

      {/* ... tabs content ... */}

      {/* Dialogs */}
      {profile && (
        <FollowsDialog
          isOpen={isFollowsDialogOpen}
          onOpenChange={setIsFollowsDialogOpen}
          userId={profile.id}
          username={profile.username}
          initialTab={followsDialogTab}
        />
      )}


      {/* Tabs Navigation */}
      <div className="px-4 mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-muted">
            <TabsTrigger value="posts" className="flex-1 gap-1 text-xs data-[state=active]:bg-card data-[state=active]:text-foreground">
              <BookOpen className="h-3 w-3" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex-1 gap-1 text-xs data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Folder className="h-3 w-3" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex-1 gap-1 text-xs data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Bookmark className="h-3 w-3" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="awards" className="flex-1 gap-1 text-xs data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Award className="h-3 w-3" />
              Awards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4 space-y-3">
            {displayedPosts.length > 0 ? (
              displayedPosts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  onUpvote={toggleUpvote}
                  onBookmark={toggleBookmark}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                No posts yet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
              {isOwnProfile && profile && (
                <div className="h-full min-h-[250px]">
                  <AddProjectDialog
                    userId={profile.id}
                    onProjectAdded={fetchProjects}
                  />
                </div>
              )}
              {userProjects.map((project) => (
                <div key={project.id} className="h-full min-h-[250px]">
                  <ProjectCard project={project} />
                </div>
              ))}
              {!isOwnProfile && userProjects.length === 0 && (
                <div className="col-span-full h-40 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                  <p>No projects showcased yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            {isOwnProfile && savedPosts.length > 0 ? (
              <div className="space-y-3">
                {savedPosts.map((post) => (
                  <FeedPost
                    key={post.id}
                    post={post}
                    onUpvote={toggleUpvote}
                    onBookmark={toggleBookmark}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                {isOwnProfile ? "No saved posts." : "Saved posts are private."}
              </div>
            )}
          </TabsContent>

          <TabsContent value="awards" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <TiltCard key={achievement.id} intensity={10} className="h-full">
                    <Card className="bg-card border-border h-full">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-full bg-muted ${achievement.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-foreground text-sm">{achievement.title}</p>
                      </CardContent>
                    </Card>
                  </TiltCard>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Showcase Section */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          Showcase
        </h3>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Badges</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge.id} className={`${badge.color} text-primary-foreground text-xs border-0`}>
                {badge.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Edit Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="relative h-32 w-full rounded-lg bg-muted overflow-hidden border-2 border-dashed border-border group">
                {editForm.backgroundImage ? (
                  <img src={editForm.backgroundImage} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Cover Image</div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => backgroundInputRef.current?.click()}>
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <input type="file" ref={backgroundInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'backgroundImage')} />
              </div>
              <div className="flex justify-center -mt-12 relative z-10">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-background">
                    <AvatarImage src={editForm.avatar} className="object-cover" />
                    <AvatarFallback>{(editForm.name || "U")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-foreground">Full Name</Label>
                <Input id="name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-background border-border text-foreground" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username" className="text-foreground">Username</Label>
                <Input id="username" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="bg-background border-border text-foreground" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio" className="text-foreground">Bio</Label>
                <Input id="bio" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="bg-background border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="department" className="text-foreground">Department</Label>
                  <Input id="department" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="bg-background border-border text-foreground" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="college" className="text-foreground">College</Label>
                  <Input id="college" value={editForm.college} onChange={(e) => setEditForm({ ...editForm, college: e.target.value })} className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year" className="text-foreground">Passout Year</Label>
                <Input id="year" value={editForm.passOutYear} onChange={(e) => setEditForm({ ...editForm, passOutYear: e.target.value })} className="bg-background border-border text-foreground" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleEditSave} disabled={isSaving} className="bg-primary text-primary-foreground">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
