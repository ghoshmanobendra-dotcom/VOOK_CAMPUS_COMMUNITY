
import { useState, useEffect } from "react";
import { Search, Users, Plus, Volume2, ArrowRight, Loader2, UserPlus, UserCheck, GraduationCap, Building2, ChevronRight, Hash, ShieldCheck, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import TiltCard from "@/components/TiltCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

// --- Types ---
interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  owner_id: string;
  created_at: string;
  announcement_chat_id?: string;
}

const Community = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCommName, setNewCommName] = useState("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [isCreatingComm, setIsCreatingComm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // New State for Community Groups
  const [linkedGroups, setLinkedGroups] = useState<any[]>([]);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [candidateGroups, setCandidateGroups] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUserId(session.user.id);
    });
    fetchCommunities();
  }, []);

  // Fetch groups for the selected community
  useEffect(() => {
    if (selectedCommunity) {
      fetchCommunityGroups(selectedCommunity.id);
    } else {
      setLinkedGroups([]);
    }
  }, [selectedCommunity]);

  // Fetch groups eligible to be added
  useEffect(() => {
    if (isAddGroupOpen && currentUserId) {
      fetchCandidateGroups();
    }
  }, [isAddGroupOpen, currentUserId]);

  const fetchCommunities = async () => {
    const { data, error } = await supabase
      .from('communities')
      .select(`
        *,
        chats (
          id,
          is_announcement
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching communities:", error);
    } else {
      const formatted = data?.map((comm: any) => ({
        ...comm,
        announcement_chat_id: comm.chats?.find((c: any) => c.is_announcement)?.id
      }));
      setCommunities(formatted || []);
    }
  };

  const fetchCommunityGroups = async (communityId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('community_id', communityId)
      .eq('type', 'group')
      .eq('is_announcement', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLinkedGroups(data);
    }
  };

  const fetchCandidateGroups = async () => {
    setIsLoadingGroups(true);
    try {
      // 1. Get chats I am admin of
      const { data: participations, error: partError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUserId)
        .eq('role', 'admin');

      if (partError) throw partError;

      const adminChatIds = participations.map(p => p.chat_id);

      if (adminChatIds.length === 0) {
        setCandidateGroups([]);
        return;
      }

      // 2. Get details of these chats, ensuring they are NOT already in a community
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .in('id', adminChatIds)
        .eq('type', 'group')
        .is('community_id', null);

      if (chatsError) throw chatsError;

      setCandidateGroups(chats || []);
    } catch (err) {
      console.error("Error fetching candidate groups:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load your groups." });
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleAddGroupToCommunity = async (chatId: string) => {
    if (!selectedCommunity) return;

    try {
      const { error } = await supabase
        .from('chats')
        .update({ community_id: selectedCommunity.id })
        .eq('id', chatId);

      if (error) throw error;

      toast({ title: "Group Added", description: "Group is now part of this community." });

      fetchCommunityGroups(selectedCommunity.id);
      setIsAddGroupOpen(false);

    } catch (err) {
      console.error("Error adding group:", err);
      toast({ variant: "destructive", title: "Failed", description: "Could not add group." });
    }
  };

  const openGroupChat = (chat: any) => {
    navigate('/chats', {
      state: {
        openChatId: chat.id,
        isCommunity: true,
        communityName: selectedCommunity?.name
      }
    });
  };

  const handleCreateCommunity = async () => {
    if (!newCommName.trim() || !currentUserId) return;
    setIsCreatingComm(true);

    try {
      const { data: commData, error: commError } = await supabase
        .from('communities')
        .insert({
          name: newCommName,
          description: newCommDesc,
          owner_id: currentUserId,
        })
        .select()
        .single();

      if (commError) throw commError;

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          type: 'group',
          is_announcement: true,
          community_id: commData.id,
          created_by: currentUserId,
          name: `${newCommName} Announcements`,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add creator as admin participant
      const { error: partError } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: chatData.id,
          user_id: currentUserId,
          role: 'admin'
        });

      if (partError) throw partError;

      toast({ title: "Community Created", description: `"${newCommName}" has been created successfully.` });
      setIsCreateOpen(false);
      setNewCommName("");
      setNewCommDesc("");
      fetchCommunities();

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create community." });
    } finally {
      setIsCreatingComm(false);
    }
  };

  const openAnnouncementChat = (comm: Community) => {
    if (comm.announcement_chat_id) {
      navigate('/chats', {
        state: {
          openChatId: comm.announcement_chat_id,
          isCommunity: true,
          communityName: comm.name // Pass community name for header
        }
      });
    } else {
      toast({ title: "Unavailable", description: "This community has no channels yet." });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="px-4 py-4 max-w-xl mx-auto flex flex-col gap-4">

        <AnimatePresence mode="wait">
          {!selectedCommunity ? (
            // VIEW 1: LIST OF COMMUNITIES
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-['Outfit']">Communities</h1>
              </div>

              {/* Create New Prompt */}
              <div
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">New Community</h3>
                  <p className="text-xs text-muted-foreground">Bring your groups together</p>
                </div>
              </div>

              {/* Community List */}
              <div className="space-y-3">
                {communities.map((comm, i) => (
                  <TiltCard
                    key={comm.id}
                    intensity={5}
                    onClick={() => setSelectedCommunity(comm)}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/50 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {comm.image_url ? <img src={comm.image_url} className="w-full h-full object-cover rounded-xl" /> : comm.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{comm.name}</h3>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> Announcement Group
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </TiltCard>
                ))}
              </div>
            </motion.div>
          ) : (
            // VIEW 2: COMMUNITY DETAIL (WhatsApp Style)
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Community Header */}
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setSelectedCommunity(null)} className="-ml-2">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-bold shadow-md">
                  {selectedCommunity.name[0]}
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">{selectedCommunity.name}</h2>
                  <p className="text-xs text-muted-foreground">Community</p>
                </div>
                <div className="ml-auto">
                  <Button variant="ghost" size="icon"><ShieldCheck className="w-5 h-5 text-primary" /></Button>
                </div>
              </div>

              {/* Announcements Section (Pinned) */}
              <div
                onClick={() => openAnnouncementChat(selectedCommunity)}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors shadow-sm"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Volume2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Announcements</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    Only community admins can send messages
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground">Yesterday</span>
                </div>
              </div>

              {/* Groups List */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Groups
                </h3>
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">

                  {linkedGroups.map(group => (
                    <div
                      key={group.id}
                      onClick={() => openGroupChat(group)}
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {group.image_url ? (
                          <img src={group.image_url} className="w-full h-full object-cover" />
                        ) : (
                          <Hash className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        {/* <p className="text-xs text-muted-foreground">Tap to chat</p> */}
                      </div>
                    </div>
                  ))}

                  {/* Add Group Action */}
                  <div
                    onClick={() => setIsAddGroupOpen(true)}
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors text-primary"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    <h4 className="font-medium text-sm">Add group</h4>
                  </div>
                </div>
              </div>

              {/* Other Groups */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Other Groups
                </h3>
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                  <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors opacity-70">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Management (Admins)</h4>
                      <p className="text-xs text-muted-foreground">Request to join</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 text-xs">Request</Button>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FAB for Create */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>New Community</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="w-24 h-24 bg-muted rounded-2xl mx-auto flex items-center justify-center cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors">
              <Users className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <Input placeholder="Community Name" value={newCommName} onChange={e => setNewCommName(e.target.value)} className="h-12 bg-muted/50" />
            <Input placeholder="Description (Optional)" value={newCommDesc} onChange={e => setNewCommDesc(e.target.value)} className="h-12 bg-muted/50" />
            <p className="text-xs text-muted-foreground">
              A new <b>Announcements</b> channel will be created automatically.
            </p>
            <Button onClick={handleCreateCommunity} disabled={!newCommName.trim() || isCreatingComm} className="h-12 rounded-xl mt-2">
              {isCreatingComm ? <Loader2 className="animate-spin mr-2" /> : null} Create Community
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Adding Groups */}
      <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
        <DialogContent className="max-w-sm rounded-2xl top-[30%]">
          <DialogHeader>
            <DialogTitle>Add Existing Group</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2 max-h-[50vh] overflow-y-auto">
            {isLoadingGroups ? (
              <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : candidateGroups.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p>No eligible groups found.</p>
                <p className="text-xs mt-1">You must be an admin of a group not already in a community.</p>
              </div>
            ) : (
              candidateGroups.map(group => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted cursor-pointer"
                  onClick={() => handleAddGroupToCommunity(group.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={group.image_url} />
                      <AvatarFallback>{group.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-left">
                      <span className="font-medium text-sm">{group.name}</span>
                      <span className="text-xs text-muted-foreground">Tap to add</span>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Community;
