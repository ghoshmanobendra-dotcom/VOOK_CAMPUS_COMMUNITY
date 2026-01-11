import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Phone, Video, MoreVertical, Send, Image as ImageIcon, Smile, Mic, X,
  Check, CheckCheck, AlertTriangle, Ban, Lightbulb, User, Volume2, Search, Plus, Paperclip,
  FileText, MessageSquare, Download, Trash2, Pin, BellOff, Mail, Forward, Copy
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "./MessageBubble";
import ProfileQuickView from "./ProfileQuickView";
import GifPicker from "./GifPicker";
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/context/PostContext";
import { ChatListItem } from "@/pages/Chats";
import { toast } from "sonner";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import GroupInfoDialog from "./GroupInfoDialog";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  content: string;
  type: "text" | "image" | "gif" | "video" | "audio" | "file";
  sender: "me" | "them";
  timestamp: string;
  status: "sent" | "delivered" | "read";
  reactions?: string[];
  senderId?: string;
  senderName?: string;
  fileName?: string; // Optional for files
}

interface ChatViewProps {
  chat: ChatListItem;
  onBack: () => void;
  className?: string; // Added className support
}

const ChatView = ({ chat, onBack, className }: ChatViewProps) => {
  const { currentUser, refreshUnreadMessages, setActiveChatId } = usePosts();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileQuickView, setShowProfileQuickView] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'photos'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Community / Announcement State
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [chatDetails, setChatDetails] = useState<any>(null);

  // Presence state
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  // Set active chat ID globally for notification suppression
  useEffect(() => {
    // Small timeout to ensure context updates before next message arrives if tight timing
    setActiveChatId(chat.chatId);
    return () => setActiveChatId(null);
  }, [chat.chatId, setActiveChatId]);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showEmojiPicker]);

  // Fetch Chat Details (Check for Announcement)
  useEffect(() => {
    const fetchChatDetails = async () => {
      if (!chat.chatId || !currentUser?.id) return;
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chat.chatId)
        .single();

      if (data) {
        setChatDetails(data);
        setIsAnnouncement(data.is_announcement || false);
        setIsGroup(data.type === 'group' || data.is_announcement);

        // Check if admin (creator OR admin role in participants)
        const { data: part } = await supabase
          .from('chat_participants')
          .select('role')
          .eq('chat_id', chat.chatId)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (data.created_by === currentUser.id) {
          setIsAdmin(true);
          // Self-repair: If creator is missing from participants, add them as admin
          if (!part) {
            console.log("Fixing missing admin participant for creator...");
            await supabase.from('chat_participants').insert({
              chat_id: chat.chatId,
              user_id: currentUser.id,
              role: 'admin'
            });
          }
        } else {
          setIsAdmin(part?.role === 'admin');
          // Self-repair: If regular user is viewing announcement but not a participant, add as member (Auto-Join)
          if (!part && data.is_announcement) {
            console.log("Auto-joining user to announcement channel...");
            await supabase.from('chat_participants').insert({
              chat_id: chat.chatId,
              user_id: currentUser.id,
              role: 'member'
            });
            // We don't need to set isAdmin true here, obviously
          }
        }
      }
    };
    fetchChatDetails();
  }, [chat.chatId, currentUser?.id]);


  // Fetch Messages & Subscribe
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:sender_id(full_name, username)
        `)
        .eq('chat_id', chat.chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
        return;
      }

      const formatted: Message[] = data.map((m: any) => {
        let type: Message['type'] = 'text';
        const content = m.content || "";

        if (content.startsWith('http')) {
          if (content.includes('giphy')) type = 'gif';
          else if (content.match(/\.(jpeg|jpg|gif|png|webp)$/i)) type = 'image';
          else if (content.match(/\.(mp4|webm|ogg)$/i)) type = 'video';
          else if (content.match(/\.(mp3|wav)$/i)) type = 'audio';
          else if (content.includes('/images/')) type = 'image';
          else type = 'file';
        }

        return {
          id: m.id,
          content: m.content,
          type: type,
          sender: m.sender_id === currentUser?.id ? 'me' : 'them',
          senderId: m.sender_id,
          senderName: m.sender_profile?.full_name || m.sender_profile?.username || "Unknown",
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: m.read_at ? 'read' : 'delivered',
          reactions: []
        };
      });
      setMessages(formatted);

      // Mark unread as read
      const unreadIds = data
        .filter((m: any) => m.sender_id !== currentUser?.id && !m.read_at)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);

        refreshUnreadMessages();
      }
    };

    fetchMessages();

    // Realtime Subscription
    const channel = supabase
      .channel(`chat:${chat.chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.chatId}` }, async (payload) => {
        const newMsg = payload.new as any;

        // Fetch sender profile for the new message
        const { data: senderData } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', newMsg.sender_id)
          .single();

        const content = newMsg.content || "";
        let type: Message['type'] = 'text';
        if (content.startsWith('http')) {
          if (content.includes('giphy')) type = 'gif';
          else if (content.match(/\.(jpeg|jpg|gif|png|webp)$/i)) type = 'image';
          else if (content.match(/\.(mp4|webm|ogg)$/i)) type = 'video';
          else if (content.match(/\.(mp3|wav)$/i)) type = 'audio';
          else if (content.includes('/images/')) type = 'image';
          else type = 'file';
        }

        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;

          const formattedMsg: Message = {
            id: newMsg.id,
            content: newMsg.content,
            type: type,
            sender: newMsg.sender_id === currentUser?.id ? 'me' : 'them',
            senderId: newMsg.sender_id,
            senderName: senderData?.full_name || senderData?.username || "Unknown",
            timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered'
          };
          return [...prev, formattedMsg];
        });

        if (newMsg.sender_id !== currentUser?.id) {
          try {
            await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', newMsg.id);
            refreshUnreadMessages();
          } catch (e) { console.error(e); }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        // Presence logic placeholder
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== currentUser?.id) {
          setOtherUserTyping(true);
          setTimeout(() => setOtherUserTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat.chatId, currentUser?.id]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      supabase.channel(`chat:${chat.chatId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser?.id }
      });
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !currentUser?.id) return;
    if (isAnnouncement && !isAdmin) {
      toast.error("Only admins can send messages in this channel.");
      return;
    }

    const content = inputValue;
    setInputValue("");
    setShowEmojiPicker(false);

    // Optimistic Update with temporary ID
    const tempId = "temp-" + Date.now();
    const newMessage: Message = {
      id: tempId,
      content: content,
      type: "text",
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };
    setMessages((prev) => [...prev, newMessage]);

    try {
      const { data, error } = await supabase.from('messages').insert({
        chat_id: chat.chatId,
        sender_id: currentUser.id,
        content: content
      }).select().single();

      if (error) throw error;

      // Success: Replace temp message with real one from DB
      const realMessage: Message = {
        id: data.id,
        content: data.content,
        type: "text",
        sender: "me",
        senderId: data.sender_id,
        timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "sent"
      };

      setMessages(prev => prev.map(m => m.id === tempId ? realMessage : m));

    } catch (e: any) {
      console.error("Send failed", e);
      toast.error("Failed to send message: " + e.message);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser?.id) {
      if (isAnnouncement && !isAdmin) return;

      const localUrl = URL.createObjectURL(file);
      const tempId = "temp-file-" + Date.now();

      let type: Message['type'] = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const optimisticMsg: Message = {
        id: tempId,
        content: localUrl,
        type: type,
        sender: "me",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "sent",
        fileName: file.name
      };
      setMessages(prev => [...prev, optimisticMsg]);

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);

        const { data, error } = await supabase.from('messages').insert({
          chat_id: chat.chatId,
          sender_id: currentUser.id,
          content: publicUrl
        }).select().single();

        if (error) throw error;

        // Replace optimistic with real
        setMessages(prev => prev.map(m => m.id === tempId ? {
          ...m,
          id: data.id,
          content: data.content,
          senderId: data.sender_id,
          timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } : m));

      } catch (err: any) {
        console.error("Upload failed", err);
        toast.error("Upload failed: " + err.message);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    }
  };

  const handleGifSelect = async (gifUrl: string) => {
    if (!currentUser?.id) return;
    if (isAnnouncement && !isAdmin) return;

    // Optimistic
    const tempId = "temp-gif-" + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      content: gifUrl,
      type: "gif",
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent"
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setShowGifPicker(false);

    try {
      const { data, error } = await supabase.from('messages').insert({
        chat_id: chat.chatId,
        sender_id: currentUser.id,
        content: gifUrl
      }).select().single();

      if (error) throw error;

      setMessages(prev => prev.map(m => m.id === tempId ? {
        ...m,
        id: data.id,
        senderId: data.sender_id,
        timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } : m));

    } catch (err: any) {
      toast.error("Failed to send GIF");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleEmojiClick = (emojiObject: any) => {
    setInputValue(prev => prev + emojiObject.emoji);
  };


  const toggleSelection = (id: string) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedMessageIds(new Set());

  const handleDelete = async () => {
    if (selectedMessageIds.size > 0) {
      // Delete selected messages
      const ids = Array.from(selectedMessageIds);
      try {
        const { error } = await supabase.from('messages').delete().in('id', ids);
        if (error) throw error;
        setMessages(prev => prev.filter(m => !selectedMessageIds.has(m.id)));
        toast.success(`Deleted ${selectedMessageIds.size} message(s)`);
        clearSelection();
      } catch (e) {
        toast.error("Failed to delete messages");
      }
    } else {
      // Delete Chat (Mock or Real)
      if (window.confirm("Delete this chat?")) {
        // Logic to delete chat would go here
        toast.success("Chat deleted");
        onBack();
      }
    }
  };

  const handlePin = () => {
    if (selectedMessageIds.size > 0) {
      toast.success("Messages pinned");
      clearSelection();
    } else {
      toast.success("Chat pinned");
    }
  };


  return (
    <div
      className={cn("bg-background flex flex-col h-full w-full", className)}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 shadow-sm sm:px-6"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => isGroup ? setShowGroupInfo(true) : setShowProfileQuickView(true)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10 border border-border/50">
                <AvatarImage src={chat.avatar} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                  {chat.initials}
                </AvatarFallback>
              </Avatar>
              {!isGroup && chat.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-foreground flex items-center gap-1">
                {chat.name}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {isAnnouncement && <Volume2 className="w-3 h-3 text-primary" />}
                {isAnnouncement ? "Announcements" : (isGroup ? "Group Info" : (otherUserTyping ? "Typing..." : (chat.isOnline ? "Online" : "Offline")))}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg mx-4 overflow-x-auto scrollbar-hide">
            <Button
              variant={activeTab === 'chat' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('chat')}
              className={cn("text-xs font-medium transition-all", activeTab === 'chat' && "bg-background shadow-sm")}
            >
              Chat
            </Button>
            <Button
              variant={activeTab === 'files' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('files')}
              className={cn("text-xs font-medium transition-all", activeTab === 'files' && "bg-background shadow-sm")}
            >
              Files
            </Button>
            <Button
              variant={activeTab === 'photos' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('photos')}
              className={cn("text-xs font-medium transition-all", activeTab === 'photos' && "bg-background shadow-sm")}
            >
              Photos
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full hidden sm:flex">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full hidden sm:flex">
              <Video className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("rounded-full", selectedMessageIds.size > 0 ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}>
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border shadow-lg min-w-[200px]">
                {selectedMessageIds.size > 0 ? (
                  <>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500 cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete {selectedMessageIds.size > 1 ? `(${selectedMessageIds.size})` : ""}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePin} className="cursor-pointer">
                      <Pin className="h-4 w-4 mr-2" />
                      Pin Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { toast.success("Copied to clipboard"); clearSelection(); }} className="cursor-pointer">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { toast.success("Forwarded"); clearSelection(); }} className="cursor-pointer">
                      <Forward className="h-4 w-4 mr-2" />
                      Forward
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={clearSelection} className="cursor-pointer">
                      <X className="h-4 w-4 mr-2" />
                      Cancel Selection
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => isGroup ? setShowGroupInfo(true) : setShowProfileQuickView(true)} className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      {isGroup ? "Group Info" : "View Profile"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toast.success("Marked as unread")} className="cursor-pointer">
                      <Mail className="h-4 w-4 mr-2" />
                      Mark as unread
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("Chat pinned")} className="cursor-pointer">
                      <Pin className="h-4 w-4 mr-2" />
                      Pin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("Notifications muted")} className="cursor-pointer">
                      <BellOff className="h-4 w-4 mr-2" />
                      Mute
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500 cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500 focus:text-red-500 cursor-pointer">
                      <Ban className="h-4 w-4 mr-2" />
                      Block User
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>

      {/* Tab Content */}
      {activeTab === 'chat' && (
        <ScrollArea className="flex-1 px-4 py-4 bg-muted/10">
          <div className="space-y-6 pb-4">
            {/* Announcement Banner */}
            {isAnnouncement && (
              <div className="flex flex-col items-center justify-center p-4 text-center my-4 opacity-80">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <Volume2 className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Community Announcements</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">Only community admins can send messages here.</p>
              </div>
            )}

            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSelected={selectedMessageIds.has(message.id)}
                onLongPress={() => toggleSelection(message.id)}
                onDoubleClick={() => toggleSelection(message.id)}
                onReaction={(emoji) => { }}
                emojiReactions={[]}
                index={index}
              />
            ))}

            {/* Typing Indicator */}
            <AnimatePresence>
              {otherUserTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback className="bg-muted text-foreground font-semibold text-[10px]">
                      {chat.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl rounded-bl-none px-3 py-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
                          animate={{ y: [0, -3, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      )}

      {/* Files View */}
      {activeTab === 'files' && (
        <ScrollArea className="flex-1 bg-muted/10 p-4">
          <div className="space-y-2 max-w-3xl mx-auto">
            {messages.filter(m => m.type === 'file').length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-20" />
                <p>No files shared yet</p>
              </div>
            )}
            {messages.filter(m => m.type === 'file').map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground text-sm">{m.fileName || m.content.split('/').pop() || "Document"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{m.senderName}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>
                </div>
                <a
                  href={m.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Photos View */}
      {activeTab === 'photos' && (
        <ScrollArea className="flex-1 bg-muted/10 p-4">
          {messages.filter(m => m.type === 'image').length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
              <p>No photos shared yet</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
            {messages.filter(m => m.type === 'image').map(m => (
              <div key={m.id} className="aspect-square relative group overflow-hidden rounded-xl border border-border bg-card cursor-pointer">
                <img src={m.content} alt="Shared" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button variant="secondary" size="icon" className="scan-button rounded-full h-8 w-8" onClick={() => window.open(m.content, '_blank')}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <a href={m.content} download target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="icon" className="rounded-full h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* GIF Picker */}
      <AnimatePresence>
        {showGifPicker && (
          <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-20 right-4 z-50 shadow-2xl rounded-xl overflow-hidden"
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              theme={Theme.DARK}
              width={350}
              height={400}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area (Only visible in Chat tab) */}
      {activeTab === 'chat' && (
        isAnnouncement && !isAdmin ? (
          <div className="bg-muted/50 p-4 text-center text-xs text-muted-foreground border-t border-border">
            Only admins can send messages in this group.
          </div>
        ) : (
          <TooltipProvider delayDuration={0}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-0 bg-background border-t border-border p-4"
            >
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex gap-1 pb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:bg-muted"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add files and images</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple={false}
                />

                <div className="flex-1 relative bg-muted/40 rounded-2xl border border-transparent focus-within:border-primary/30 focus-within:bg-muted/20 transition-all">
                  <Input
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="pr-24 pl-4 py-6 bg-transparent border-none focus-visible:ring-0 shadow-none text-base"
                  />

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowGifPicker(!showGifPicker)}
                          className="text-muted-foreground hover:text-primary h-8 w-8 rounded-full"
                        >
                          <div className="border border-current rounded px-1 text-[9px] font-bold">GIF</div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose GIF</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowEmojiPicker(!showEmojiPicker);
                            setShowGifPicker(false);
                          }}
                          className={cn("h-8 w-8 rounded-full transition-colors", showEmojiPicker ? "text-primary" : "text-muted-foreground hover:text-primary")}
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose Emoji</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="pb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-11 rounded-full shadow-md"
                      >
                        <Send className="h-5 w-5 ml-0.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send message</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              </div>
            </motion.div>
          </TooltipProvider>
        ))
      }

      {/* Profile Quick View Dialog */}
      <ProfileQuickView
        user={{ ...chat, id: chat.userId, color: 'bg-muted' }}
        open={showProfileQuickView}
        onClose={() => setShowProfileQuickView(false)}
      />

      <GroupInfoDialog
        chatId={chat.chatId}
        open={showGroupInfo}
        onOpenChange={setShowGroupInfo}
      />
    </div>
  );
};

export default ChatView;
