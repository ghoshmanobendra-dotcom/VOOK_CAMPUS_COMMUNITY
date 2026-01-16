import { useState, useEffect } from "react";
import { Search, Users, Plus, Volume2, ArrowRight, Loader2, UserPlus, UserCheck, GraduationCap, Building2, ChevronRight, Hash, ShieldCheck, ChevronLeft, Check } from "lucide-react";
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
import CommunitySidebar from "@/components/community/CommunitySidebar";
import CommunityDetailView from "@/components/community/CommunityDetailView";

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
  const [selectedGroupsToAdd, setSelectedGroupsToAdd] = useState<string[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isDiscoverGroupsOpen, setIsDiscoverGroupsOpen] = useState(false);

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
      .select(`
        *,
        participants:chat_participants (
          user_id
        )
      `)
      .eq('community_id', communityId)
      .eq('type', 'group')
      .eq('is_announcement', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedGroups = data.map((group: any) => {
        const participants = group.participants || [];
        return {
          ...group,
          member_count: participants.length, // Useful for display
          is_member: participants.some((p: any) => p.user_id === currentUserId)
        };
      });
      setLinkedGroups(formattedGroups);
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

  const handleAddGroupsToCommunity = async () => {
    if (!selectedCommunity || selectedGroupsToAdd.length === 0) return;

    try {
      const { error } = await supabase
        .from('chats')
        .update({ community_id: selectedCommunity.id })
        .in('id', selectedGroupsToAdd);

      if (error) throw error;

      // --- MEMBER SYNC LOGIC ---
      // 1. Fetch all participants from the added groups
      const { data: participants, error: partError } = await supabase
        .from('chat_participants')
        .select('user_id')
        .in('chat_id', selectedGroupsToAdd);

      if (partError) {
        console.error("Error fetching group participants for sync:", partError);
        // Don't throw, as the group move succeeded. Just warn/toast.
        toast({ variant: "destructive", title: "Warning", description: "Groups added, but member sync failed." });
      } else if (participants && participants.length > 0) {
        // 2. Prepare batch insert for community_members
        // Use a Set to avoid duplicates within the batch
        const uniqueUserIds = new Set(participants.map(p => p.user_id));
        const newMembers = Array.from(uniqueUserIds).map(userId => ({
          community_id: selectedCommunity.id,
          user_id: userId,
          role: 'member' // Default role
        }));

        // 3. Batch Insert (Upsert to ignore existing)
        const { error: syncError } = await supabase
          .from('community_members')
          .upsert(newMembers, { onConflict: 'community_id,user_id', ignoreDuplicates: true });

        if (syncError) {
          console.error("Error syncing members:", syncError);
          toast({ variant: "destructive", title: "Warning", description: "Groups added, but member sync had errors." });
        } else {
          console.log(`Synced ${newMembers.length} members to community.`);
        }
      }

      toast({
        title: "Groups Added",
        description: `${selectedGroupsToAdd.length} group(s) added. Members synced.`
      });

      fetchCommunityGroups(selectedCommunity.id);
      setIsAddGroupOpen(false);
      setSelectedGroupsToAdd([]);

    } catch (err) {
      console.error("Error adding groups:", err);
      toast({ variant: "destructive", title: "Failed", description: "Could not add groups." });
    }
  };

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    if (!currentUserId || !selectedCommunity) return;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: groupId,
          user_id: currentUserId,
          role: 'member'
        });

      if (error) throw error;

      toast({ title: "Joined Group", description: `You have joined ${groupName}` });

      // Refresh groups logic
      fetchCommunityGroups(selectedCommunity.id);

    } catch (e) {
      console.error("Join group error:", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to join group." });
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
    <div className="min-h-screen bg-background pb-20 md:pb-0 h-screen flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 flex overflow-hidden">

        {/* VIEW 1: LANDING & LIST (When No Community Selected) + Dashboard Sidebar for styling? */}
        {/* Actually, if selectedCommunity is null, we show the landing. If selected, we show the NEW layout. */}

        <AnimatePresence mode="wait">
          {!selectedCommunity ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full overflow-y-auto px-4 py-4"
            >
              <div className="max-w-5xl mx-auto flex flex-col gap-4 pb-20">
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

                <div className="space-y-4 max-w-3xl mx-auto w-full">
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
              </div>
            </motion.div>
          ) : (
            // VIEW 2: NEW TEAMS-STYLE LAYOUT
            <motion.div
              key="detail-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full h-full"
            >
              {/* 1. Sidebar */}
              <CommunitySidebar
                communityName={selectedCommunity.name}
                groups={linkedGroups}
                onBack={() => setSelectedCommunity(null)}
                onSelectGroup={openGroupChat}
                onAddGroup={() => setIsDiscoverGroupsOpen(true)}
                onAddExistingGroup={() => setIsAddGroupOpen(true)}
              />

              {/* Mobile Back Button (Top Left Overlay if on mobile) or handle in header? */}
              {/* For now, relying on Sidebar being hidden on mobile and standard back navigation if needed,
                    but simpler to just have a 'Back' button in DetailView maybe?
                    Actually, let's inject a specialized back/home handler for mobile in Detail View context or header.
                */}

              {/* 2. Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Mobile Only Back Nav */}
                <div className="md:hidden p-2 border-b flex items-center gap-2 bg-background">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedCommunity(null)}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="font-semibold truncate">{selectedCommunity.name}</span>
                </div>

                <CommunityDetailView
                  community={selectedCommunity}
                  groups={linkedGroups}
                  onOpenGroup={openGroupChat}
                  onOpenAnnouncement={() => openAnnouncementChat(selectedCommunity)}
                  onInvite={() => toast({ title: "Invite Link Copied", description: "Share this link with others to join." })}
                />
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
      {/* Dialog for Adding Groups (Multi-select) */}
      <Dialog open={isAddGroupOpen} onOpenChange={(open) => {
        setIsAddGroupOpen(open);
        if (!open) setSelectedGroupsToAdd([]); // Reset selection on close
      }}>
        <DialogContent className="max-w-md rounded-2xl top-[40%] bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Existing Groups</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2 max-h-[50vh] overflow-y-auto px-1 py-1">
            {isLoadingGroups ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>
            ) : candidateGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-medium">No eligible groups found.</p>
                <p className="text-xs mt-1 max-w-[200px] mx-auto opacity-70">You must be an admin of a group not already in a community.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {candidateGroups.map((group, index) => {
                    const isSelected = selectedGroupsToAdd.includes(group.id);
                    return (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200",
                          isSelected
                            ? "bg-primary/10 border-primary/50 shadow-sm"
                            : "bg-muted/30 border-transparent hover:bg-muted hover:border-border"
                        )}
                        onClick={() => {
                          setSelectedGroupsToAdd(prev =>
                            prev.includes(group.id)
                              ? prev.filter(id => id !== group.id)
                              : [...prev, group.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10 border border-border/50">
                              <AvatarImage src={group.image_url} />
                              <AvatarFallback className="bg-muted text-muted-foreground">{group.name[0]}</AvatarFallback>
                            </Avatar>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm"
                              >
                                <Check className="w-3 h-3" />
                              </motion.div>
                            )}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className={cn("font-medium text-sm transition-colors", isSelected && "text-primary")}>{group.name}</span>
                            <span className="text-xs text-muted-foreground">{isSelected ? "Selected" : "Tap to select"}</span>
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsAddGroupOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddGroupsToCommunity}
              disabled={selectedGroupsToAdd.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 transition-all"
            >
              {selectedGroupsToAdd.length > 0 ? `Add ${selectedGroupsToAdd.length} Group${selectedGroupsToAdd.length > 1 ? 's' : ''}` : 'Select Groups'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discover Groups Modal */}
      <Dialog open={isDiscoverGroupsOpen} onOpenChange={setIsDiscoverGroupsOpen}>
        <DialogContent className="max-w-md rounded-2xl top-[40%] bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
          <DialogHeader>
            <DialogTitle className="text-xl">Discover Groups</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2 max-h-[50vh] overflow-y-auto px-1 py-1">
            {linkedGroups.filter(g => !g.is_member).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-medium">No new groups to join.</p>
                <p className="text-xs mt-1 max-w-[200px] mx-auto opacity-70">You are already a member of all active groups in this community.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedGroups.filter(g => !g.is_member).map(group => (
                  <div key={group.id} className="flex items-center justify-between p-3 rounded-xl border bg-card/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={group.image_url} />
                        <AvatarFallback>{group.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{group.name}</span>
                        <span className="text-xs text-muted-foreground">{group.member_count} members</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleJoinGroup(group.id, group.name)}>
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Community;
