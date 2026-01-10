import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CreatePostBox, { FilterTab } from "@/components/CreatePostBox";
import SocialFeed from "@/components/SocialFeed";
import StatusSection from "@/components/StatusSection";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  college?: string;
  isFollowing?: boolean;
}

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("campus");

  useEffect(() => {
    const fetchPeople = async () => {
      if (!searchQuery.trim()) {
        setPeople([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase.from('profiles').select('*');
        query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);

        if (user) {
          query = query.neq('id', user.id);
        }

        const { data: profiles, error } = await query.limit(5);

        if (error) throw error;

        if (user && profiles && profiles.length > 0) {
          const { data: follows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          const followingIds = new Set(follows?.map(f => f.following_id) || []);

          const profilesWithFollow = profiles.map(p => {
            const isFollowing = followingIds.has(p.id);
            console.log(`Index person ${p.id} isFollowing: ${isFollowing}`);
            return { ...p, isFollowing };
          });

          setPeople(profilesWithFollow);
        } else {
          setPeople(profiles || []);
        }

      } catch (error) {
        console.error("Error fetching people:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchPeople, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleFollowUser = async (userId: string, currentStatus: boolean | undefined) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to follow users");
        return;
      }
  
      console.log(`Index handleFollowUser currentStatus: ${currentStatus} for userId: ${userId}`);
  
      setPeople(prev => prev.map(p =>
        p.id === userId ? { ...p, isFollowing: !currentStatus } : p
      ));
  
      if (currentStatus) {
        const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
        if (error) throw error;
        toast.success("Unfollowed");
        console.log(`Index deleted follow: ${user.id} -> ${userId}`);
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
        if (error) throw error;
        toast.success("Following");
        console.log(`Index inserted follow: ${user.id} -> ${userId}`);
      }
    } catch (error: any) {
      console.error("Follow error:", error);
      toast.error("Action failed");
      setPeople(prev => prev.map(p =>
        p.id === userId ? { ...p, isFollowing: currentStatus } : p
      ));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="flex flex-col gap-4 py-4 px-4 max-w-xl mx-auto">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border rounded-full h-12 shadow-sm focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Search Results */}
        <AnimatePresence>
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {isSearching ? (
                <div className="text-center py-4 text-xs text-muted-foreground">Searching...</div>
              ) : people.length > 0 ? (
                people.map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-3 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-card transition-colors">
                    <div className="flex items-center gap-3 cursor-pointer overflow-hidden" onClick={() => navigate(`/profile/${person.id}`, { state: { preCheckFollow: person.isFollowing, profile: person } })}>
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={person.avatar_url} />
                        <AvatarFallback>{(person.full_name || "U")[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm text-foreground truncate">{person.full_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{person.college || "@" + person.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={person.isFollowing ? "secondary" : "default"}
                      onClick={() => handleFollowUser(person.id, person.isFollowing)}
                      className="h-8 px-3 text-xs rounded-full"
                    >
                      {person.isFollowing ? "Following" : "Follow"}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No users found
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <StatusSection />
        <CreatePostBox activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        <SocialFeed filter={activeFilter} />
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
