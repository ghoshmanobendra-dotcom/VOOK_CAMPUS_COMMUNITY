import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MoreVertical, Edit2, X, UserPlus, Check, Loader2, BellOff, Trash2, Pin, Mail, Video, Phone, Plus, Image, Smile, Mic, Paperclip, ArrowLeft } from "lucide-react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import BottomNav from "@/components/BottomNav";
import ChatView from "@/components/chat/ChatView";
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/context/PostContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Users } from "lucide-react";
import CreateGroupDialog from "@/components/chat/CreateGroupDialog";
import { cn } from "@/lib/utils";

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
  isPinned?: boolean; // Local state for demo
  isMuted?: boolean;  // Local state for demo
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
  }, [markMessagesAsRead]);

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
          isGroup: isGroup,
          isPinned: false, // Default
          isMuted: false   // Default
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
      const { data: myChats } = await supabase.from('chat_participants').select('chat_id').eq('user_id', currentUser.id);
      const myChatIds = myChats?.map(c => c.chat_id) || [];

      if (myChatIds.length > 0) {
        const { data: existing } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .in('chat_id', myChatIds)
          .eq('user_id', targetUser.id)
          .single();

        if (existing) {
          const existingChat = chats.find(c => c.chatId === existing.chat_id);
          if (existingChat) {
            setActiveChat(existingChat);
          } else {
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

      const { data: newChat, error: cError } = await supabase.from('chats').insert({ type: 'private' }).select().single();
      if (cError) throw cError;

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
      fetchChats();

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
    if (location.state?.isCommunity) {
      navigate('/community');
    } else {
      setActiveChat(null);
      fetchChats();
      window.history.replaceState({}, document.title);
    }
  };

  // Context Menu Handlers (UI Only for now as per prompt instructions regarding schema)
  const handleMarkUnread = (chatId: string) => {
    // In a real app, update DB. Here, we'd locally toggle.
    setChats(prev => prev.map(c => c.chatId === chatId ? { ...c, unreadCount: c.unreadCount > 0 ? 0 : 1 } : c));
    toast.success("Conversation marked");
  };

  const handlePinChat = (chatId: string) => {
    setChats(prev => prev.map(c => c.chatId === chatId ? { ...c, isPinned: !c.isPinned } : c));
    toast.success("Conversation pinned");
  };

  const handleMuteChat = (chatId: string) => {
    setChats(prev => prev.map(c => c.chatId === chatId ? { ...c, isMuted: !c.isMuted } : c));
    toast("Notifications muted");
  };

  const handleDeleteChatUI = (chatId: string) => {
    // Soft confirm handled by logic or UI, here simple alert or toast
    toast("Conversation deleted", {
      description: "This will be removed from your list.",
      action: {
        label: "Undo",
        onClick: () => console.log("Undo delete"),
      },
    });
    setChats(prev => prev.filter(c => c.chatId !== chatId));
  };


  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Left Sidebar (Chats List) */}
      <div className={cn(
        "w-full md:w-[320px] lg:w-[380px] flex flex-col border-r border-border bg-card/50 backdrop-blur-sm z-30 transition-all duration-300",
        activeChat ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-['Outfit']">Chat</h1>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/community')} title="Communities">
              <Users className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Edit2 className="h-5 w-5 text-primary" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-sm">
                <DialogHeader>
                  <DialogTitle>New Chat</DialogTitle>
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
                      className="pl-10 bg-muted"
                    />
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
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
                          <span className="font-medium">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground">{user.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sticky Search Bar */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-muted/50 border-none focus:ring-1 focus:ring-primary/20 rounded-md"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
          {loading && (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}
          {!loading && filteredChats.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4">No conversations yet.</div>
          )}
          {filteredChats.map((chat) => (
            <motion.div
              key={chat.chatId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all relative",
                activeChat?.chatId === chat.chatId ? "bg-muted/80 shadow-sm" : "hover:bg-muted/40"
              )}
              onClick={() => setActiveChat(chat)}
            >
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={chat.avatar} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary font-medium text-xs">
                    {chat.initials}
                  </AvatarFallback>
                </Avatar>
                {chat.isOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex justify-between items-center">
                  <h3 className={cn("font-medium truncate text-sm", chat.unreadCount > 0 ? "text-foreground font-bold" : "text-foreground/90")}>
                    {chat.name}
                  </h3>
                  <span className="text-[10px] text-muted-foreground shrink-0 opacity-70 group-hover:opacity-100">
                    {chat.timestamp ? formatDistanceToNow(new Date(chat.timestamp), { addSuffix: false }).replace('about ', '').replace('less than a minute', 'Just now') : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={cn("text-xs truncate max-w-[180px]", chat.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {chat.lastMessage}
                  </p>

                  {/* Helper Icons */}
                  <div className="flex items-center gap-1">
                    {chat.isPinned && <Pin className="h-3 w-3 text-muted-foreground rotate-45" />}
                    {chat.isMuted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                    {chat.unreadCount > 0 && (
                      <div className="h-2 w-2 bg-primary rounded-full group-hover:scale-110 transition-transform" />
                    )}
                  </div>
                </div>
              </div>

              {/* Dropdown Menu for Context Actions */}
              <div onClick={(e) => e.stopPropagation()} className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur rounded-full shadow-sm">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card border-border z-50">
                    <DropdownMenuItem onClick={() => handleMarkUnread(chat.chatId)}>
                      <Mail className="h-4 w-4 mr-2" />
                      {chat.unreadCount > 0 ? "Mark as read" : "Mark as unread"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePinChat(chat.chatId)}>
                      <Pin className="h-4 w-4 mr-2" />
                      {chat.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMuteChat(chat.chatId)}>
                      <BellOff className="h-4 w-4 mr-2" />
                      {chat.isMuted ? "Unmute" : "Mute"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={() => handleDeleteChatUI(chat.chatId)} className="text-red-500 focus:text-red-500">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>



        {/* Mobile Bottom Nav Spacer if needed, or hide BottomNav on Desktop via CSS media queries in the component effectively */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "hidden md:flex flex-1 flex-col bg-background relative z-0 overflow-hidden",
        activeChat ? "flex fixed inset-0 md:relative z-40 bg-background" : "hidden md:flex bg-background/50"
      )}>
        {activeChat ? (
          <ChatView
            chat={activeChat}
            onBack={handleChatBack}
            className="h-full w-full"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground/50">
            <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <Smile className="relative h-10 w-10 text-muted-foreground/50" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">Select a conversation</h2>
            <p className="max-w-xs text-sm">Pick a person from the left to start chatting.</p>
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onGroupCreated={() => fetchChats()}
      />

    </div>
  );
};

export default Chats;
