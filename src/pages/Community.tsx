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
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import CommunityHero from "@/components/community/CommunityHero";
import CreateCommunityWizard from "@/components/community/CreateCommunityWizard";

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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [initialTemplateId, setInitialTemplateId] = useState<string | null>(null);
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

  const handleCreateCommunity = async (data: { name: string; description: string; templateId?: string }) => {
    if (!data.name.trim() || !currentUserId) return;
    setIsCreatingComm(true);

    try {
      // Create Community Record
      const { data: commData, error: commError } = await supabase
        .from('communities')
        .insert({
          name: data.name,
          description: data.description,
          owner_id: currentUserId,
        })
        .select()
        .single();

      if (commError) throw commError;

      // Create Announcement Chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          type: 'group',
          is_announcement: true,
          community_id: commData.id,
          created_by: currentUserId,
          name: `${data.name} Announcements`,
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

      toast({ title: "Community Created", description: `"${data.name}" has been created successfully.` });
      setIsWizardOpen(false);
      fetchCommunities();

    } catch (error) {
      console.error(error);
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
          communityName: comm.name
        }
      });
    } else {
      toast({ title: "Unavailable", description: "This community has no channels yet." });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="px-4 py-4 max-w-5xl mx-auto flex flex-col gap-4">

        <AnimatePresence mode="wait">
          {!selectedCommunity ? (
            // VIEW 1: LANDING & LIST
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <CommunityHero
                onCreateClick={() => {
                  setInitialTemplateId(null);
                  setIsWizardOpen(true);
                }}
                onTemplateClick={(id) => {
                  setInitialTemplateId(id);
                  setIsWizardOpen(true);
                }}
              />

              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-bold font-['Outfit']">Your Communities</h2>
                </div>

                {communities.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border/50">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>You haven't joined any communities yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {communities.map((comm) => (
                      <TiltCard
                        key={comm.id}
                        intensity={5}
                        onClick={() => setSelectedCommunity(comm)}
                        className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/50 transition-all group shadow-sm hover:shadow-md h-full"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/80 to-violet-600/80 flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
                          {comm.image_url ? <img src={comm.image_url} className="w-full h-full object-cover rounded-xl" /> : comm.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{comm.name}</h3>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Users className="w-3 h-3" /> {Math.floor(Math.random() * 50) + 1} members
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </TiltCard>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // VIEW 2: COMMUNITY DETAIL (Preserved Existing UI Logic with minor layout tweaks)
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 max-w-2xl mx-auto w-full"
            >
              {/* Community Header */}
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setSelectedCommunity(null)} className="-ml-2">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-bold shadow-md text-xl">
                  {selectedCommunity.name[0]}
                </div>
                <div>
                  <h2 className="font-bold text-xl leading-tight">{selectedCommunity.name}</h2>
                  <p className="text-sm text-muted-foreground">Community</p>
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
                  {/* Mock Timestamp */}
                  <span className="text-[10px] text-muted-foreground">Pinned</span>
                </div>
              </div>

              {/* Groups List */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Groups
                </h3>
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">

                  {linkedGroups.map(group => (
                    <div
                      key={group.id}
                      onClick={() => openGroupChat(group)}
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border/50">
                        {group.image_url ? (
                          <img src={group.image_url} className="w-full h-full object-cover" />
                        ) : (
                          <Hash className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{group.name}</h4>
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
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
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

      {/* New Creation Wizard */}
      <CreateCommunityWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSubmit={handleCreateCommunity}
        isLoading={isCreatingComm}
        initialTemplateId={initialTemplateId}
      />

      {/* Dialog for Adding Groups (Preserved) */}
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
