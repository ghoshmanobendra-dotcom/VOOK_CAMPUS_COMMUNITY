import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MoreVertical, Edit2, X, UserPlus, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BottomNav from "@/components/BottomNav";
import ChatView from "@/components/chat/ChatView";
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/context/PostContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Users } from "lucide-react";
import CreateGroupDialog from "@/components/chat/CreateGroupDialog";

// Interface for the list view
export interface ChatListItem {
  chatId: string;
  userId: string;
  name: string;
  username: string;
  avatar?: string;
  initials: string;
  lastMessage: string;
  timestamp: string; // ISO string
  unreadCount: number;
  isOnline?: boolean;
  isGroup?: boolean;
}

// Interface for searching users
interface SearchUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
}

const Chats = () => {
  const { currentUser, markMessagesAsRead } = usePosts();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatListItem | null>(null);
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Chat Search
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [foundUsers, setFoundUsers] = useState<SearchUser[]>([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Mark badge as cleared when visiting list
  useEffect(() => {
    markMessagesAsRead();
  }, []);

  // 1. Fetch Chats
  const fetchChats = async () => {
    if (!currentUser?.id) return;

    try {
      // Get all chats I am in
      const { data: myParticipations, error: myError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUser.id);

      if (myError) throw myError;

      if (!myParticipations || myParticipations.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      const chatIds = myParticipations.map(c => c.chat_id);

      // fetch chat metadata
      const { data: chatsData, error: cError } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds);

      if (cError) throw cError;

      // Get partners for private chats
      const privateChatIds = chatsData?.filter(c => c.type === 'private').map(c => c.id) || [];

      let partnersMap = new Map();
      if (privateChatIds.length > 0) {
        const { data: partners } = await supabase
          .from('chat_participants')
          .select('chat_id, profiles:user_id(id, full_name, username, avatar_url)')
          .in('chat_id', privateChatIds)
          .neq('user_id', currentUser.id);

        partners?.forEach((p: any) => partnersMap.set(p.chat_id, p.profiles));
      }

      // Get latest message for each chat
      const { data: messages, error: mError } = await supabase
        .from('messages')
        .select('chat_id, content, created_at, sender_id, read_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false });

      if (mError) throw mError;

      // Map to latest message per chat
      const latestMsgMap = new Map();
      messages?.forEach((m: any) => {
        if (!latestMsgMap.has(m.chat_id)) latestMsgMap.set(m.chat_id, m);
      });

      // Combine
      const formattedChats: ChatListItem[] = chatsData?.map((c: any) => {
        const lastMsg = latestMsgMap.get(c.id);

        let name = c.name;
        let avatar = c.image_url || c.avatar_url;
        let userId = "";
        let isGroup = c.type === 'group';

        let partner = null;

        if (!isGroup) {
          partner = partnersMap.get(c.id);
          if (partner) {
            name = partner.full_name || partner.username;
            avatar = partner.avatar_url;
            userId = partner.id;
          } else {
            name = "Unknown User";
          }
        }

        return {
          chatId: c.id,
          userId: userId,
          name: name || "Group Chat",
          username: isGroup ? "" : (partner ? partner.username : "@user"),
          avatar: avatar,
          initials: (name || "C")[0].toUpperCase(),
          lastMessage: lastMsg ? (
            lastMsg.content.includes('giphy') ? 'Sent a GIF' :
              (lastMsg.content.startsWith('http') && lastMsg.content.includes('/images/')) ? 'Sent an image' :
                lastMsg.content
          ) : "Start a conversation",
          timestamp: lastMsg ? lastMsg.created_at : c.created_at,
          unreadCount: (lastMsg && lastMsg.sender_id !== currentUser.id && !lastMsg.read_at) ? 1 : 0,
          isOnline: false,
          isGroup: isGroup
        };
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];

      setChats(formattedChats);
    } catch (err: any) {
      console.error("Error fetching chats:", err);
      toast.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to new messages to update list
    const channel = supabase
      .channel('public:messages_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);



  // Search Users for New Chat
  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearchQuery.trim() || !currentUser?.id) {
        setFoundUsers([]);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${userSearchQuery}%,username.ilike.%${userSearchQuery}%`)
        .neq('id', currentUser.id)
        .limit(10);

      setFoundUsers(data || []);
    };

    const timeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeout);
  }, [userSearchQuery, currentUser?.id]);

  const handleStartNewChat = async (targetUser: SearchUser) => {
    if (!currentUser?.id) return;
    setIsCreatingChat(true);

    try {
      // Check if chat exists
      // Simple approach: Fetch all my chats, check if target is in them.
      // Ideally we should have a more direct query or caching.
      // Re-using fetch logic for simplicity or optimization:

      // 1. Get my chat IDs
      const { data: myChats } = await supabase.from('chat_participants').select('chat_id').eq('user_id', currentUser.id);
      const myChatIds = myChats?.map(c => c.chat_id) || [];

      if (myChatIds.length > 0) {
        // 2. Check if target is in any of these
        const { data: existing } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .in('chat_id', myChatIds)
          .eq('user_id', targetUser.id)
          .single();

        if (existing) {
          // Open existing
          const existingChat = chats.find(c => c.chatId === existing.chat_id);
          if (existingChat) {
            setActiveChat(existingChat);
          } else {
            // It exists but wasn't loaded in list (maybe empty?), construct object
            setActiveChat({
              chatId: existing.chat_id,
              userId: targetUser.id,
              name: targetUser.full_name,
              username: targetUser.username,
              avatar: targetUser.avatar_url,
              initials: targetUser.full_name[0],
              lastMessage: "",
              timestamp: new Date().toISOString(),
              unreadCount: 0
            });
          }
          setIsAddDialogOpen(false);
          setIsCreatingChat(false);
          return;
        }
      }

      // Create New Chat
      const { data: newChat, error: cError } = await supabase.from('chats').insert({ type: 'private' }).select().single();
      if (cError) throw cError;

      // Add participants
      const { error: pError } = await supabase.from('chat_participants').insert([
        { chat_id: newChat.id, user_id: currentUser.id },
        { chat_id: newChat.id, user_id: targetUser.id }
      ]);
      if (pError) throw pError;

      setActiveChat({
        chatId: newChat.id,
        userId: targetUser.id,
        name: targetUser.full_name,
        username: targetUser.username,
        avatar: targetUser.avatar_url,
        initials: targetUser.full_name[0],
        lastMessage: "",
        timestamp: new Date().toISOString(),
        unreadCount: 0
      });

      setIsAddDialogOpen(false);
      fetchChats(); // Refresh list

    } catch (e: any) {
      console.error("Error creating chat:", e);
      toast.error("Failed to create chat: " + e.message);
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Handle auto-start from other pages
  useEffect(() => {
    const handleNavigationState = async () => {
      if (!currentUser?.id) return;

      if (location.state?.startChatWith) {
        handleStartNewChat(location.state.startChatWith);
      } else if (location.state?.openChatId) {
        const chatId = location.state.openChatId;
        const existing = chats.find(c => c.chatId === chatId);

        if (existing) {
          setActiveChat(existing);
        } else {
          // Fetch minimal details for temp chat object
          const { data: chatData } = await supabase
            .from('chats')
            .select('*')
            .eq('id', chatId)
            .single();

          if (chatData) {
            const tempChat: ChatListItem = {
              chatId: chatData.id,
              userId: chatData.created_by,
              name: chatData.name || "Chat",
              username: "",
              avatar: chatData.image_url || chatData.avatar_url,
              initials: (chatData.name || "C")[0]?.toUpperCase(),
              lastMessage: chatData.is_announcement ? "Community Announcements" : "Tap to chat",
              timestamp: chatData.created_at,
              unreadCount: 0,
              isGroup: true
            };
            setActiveChat(tempChat);
          }
        }
      }

      if (location.state?.startChatWith || location.state?.openChatId) {
        window.history.replaceState({}, document.title);
      }
    };

    handleNavigationState();
  }, [location.state, currentUser?.id, chats]);

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatBack = () => {
    // If we came from community, go back to community
    if (location.state?.isCommunity) {
      navigate('/community');
    } else {
      setActiveChat(null);
      fetchChats();
      // Clear location state to prevent loop if user refreshes
      window.history.replaceState({}, document.title);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-4"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-['Outfit'] text-foreground">Chats</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem className="text-foreground focus:bg-muted">Mark all as read</DropdownMenuItem>
              <DropdownMenuItem className="text-foreground focus:bg-muted">Archived chats</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      <div className="px-4 py-4 space-y-6">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border focus:border-primary text-foreground"
          />
        </motion.div>

        {/* Messages Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Messages
            </h2>
            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </div>

          <div className="space-y-1">
            <AnimatePresence>
              {filteredChats.length === 0 && !loading && (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No conversations yet. Start one!
                </div>
              )}

              {filteredChats.map((chat, index) => (
                <motion.div
                  key={chat.chatId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: "hsl(var(--muted))" }}
                  onClick={() => setActiveChat(chat)}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border border-white/10">
                      <AvatarImage src={chat.avatar} className="object-cover" />
                      <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                        {chat.initials}
                      </AvatarFallback>
                    </Avatar>
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground truncate">
                        {chat.name}
                      </h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {chat.timestamp ? formatDistanceToNow(new Date(chat.timestamp), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {chat.lastMessage}
                      </p>
                      {chat.unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-full"
                        >
                          {chat.unreadCount}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.section>
      </div>

      {/* New Chat FAB */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
          >
            <Edit2 className="h-6 w-6" />
          </motion.button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border max-w-sm mx-4 top-[20%]">
          <DialogHeader>
            <DialogTitle className="text-foreground font-['Outfit'] text-xl">
              New Conversation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsCreateGroupOpen(true);
              }}
            >
              <Users className="h-4 w-4" />
              New Group
            </Button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-border focus:border-primary text-foreground"
              />
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
              {foundUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => !isCreatingChat && handleStartNewChat(user)}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{user.full_name}</span>
                    <span className="text-xs text-muted-foreground">{user.username}</span>
                  </div>
                  {isCreatingChat && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                </div>
              ))}
              {userSearchQuery && foundUsers.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No users found.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onGroupCreated={() => {
          fetchChats();
          // Optionally auto-open the new chat, currently fetchChats just reloads list
        }}
      />

      <BottomNav />

      {/* Individual Chat View */}
      <AnimatePresence>
        {activeChat && (
          <ChatView
            chat={activeChat}
            onBack={handleChatBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chats;
