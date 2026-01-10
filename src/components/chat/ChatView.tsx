
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Phone, Video, MoreVertical, Send, Image, Smile, Mic, X,
  Check, CheckCheck, AlertTriangle, Ban, Lightbulb, User, Volume2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export interface Message {
  id: string;
  content: string;
  type: "text" | "image" | "gif";
  sender: "me" | "them";
  timestamp: string;
  status: "sent" | "delivered" | "read";
  reactions?: string[];
  senderId?: string;
  senderName?: string;
}

interface ChatViewProps {
  chat: ChatListItem;
  onBack: () => void;
}

const ChatView = ({ chat, onBack }: ChatViewProps) => {
  const { currentUser, refreshUnreadMessages, setActiveChatId } = usePosts();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileQuickView, setShowProfileQuickView] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
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

      const formatted: Message[] = data.map((m: any) => ({
        id: m.id,
        content: m.content,
        type: m.content.startsWith('http') && (m.content.includes('/images/') || m.content.includes('giphy')) ? (m.content.includes('giphy') ? 'gif' : 'image') : 'text',
        sender: m.sender_id === currentUser?.id ? 'me' : 'them',
        senderId: m.sender_id,
        senderName: m.sender_profile?.full_name || m.sender_profile?.username || "Unknown",
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: m.read_at ? 'read' : 'delivered',
        reactions: []
      }));
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

        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;

          const formattedMsg: Message = {
            id: newMsg.id,
            content: newMsg.content,
            type: newMsg.content.includes('giphy') ? 'gif' : (newMsg.content.startsWith('http') && newMsg.content.includes('/images/') ? 'image' : 'text'),
            sender: newMsg.sender_id === currentUser?.id ? 'me' : 'them',
            senderId: newMsg.sender_id,
            senderName: senderData?.full_name || senderData?.username || "Unknown",
            timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered'
          };
          return [...prev, formattedMsg];
        });

        if (newMsg.sender_id !== currentUser?.id) {
          supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', newMsg.id);
          refreshUnreadMessages();
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser?.id) {
      if (isAnnouncement && !isAdmin) return;
      // 1. Optimistic Placeholder (optional, but good UX if we could show a spinner. For now just toast)
      // Or better: Show a "Uploading..." message?
      // Let's stick to the pattern but since we don't have the URL yet, we can't show the image immediately
      // unless we create a local object URL.
      const localUrl = URL.createObjectURL(file);
      const tempId = "temp-img-" + Date.now();

      const optimisticMsg: Message = {
        id: tempId,
        content: localUrl,
        type: "image",
        sender: "me",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "sent"
      };
      setMessages(prev => [...prev, optimisticMsg]);

      try {
        const fileName = `${currentUser.id}/${Date.now()}_${file.name}`;
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
        toast.error("Image upload failed: " + err.message);
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


  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => isGroup ? setShowGroupInfo(true) : setShowProfileQuickView(true)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={chat.avatar} />
                <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                  {chat.initials}
                </AvatarFallback>
              </Avatar>
              {!isGroup && chat.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />
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

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={() => isGroup ? setShowGroupInfo(true) : setShowProfileQuickView(true)}>
                  <User className="h-4 w-4 mr-2" />
                  {isGroup ? "Group Info" : "View Profile"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
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
              isSelected={selectedMessageId === message.id}
              onLongPress={() => setSelectedMessageId(message.id)}
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
                <Avatar className="h-8 w-8">
                  <AvatarImage src={chat.avatar} />
                  <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                    {chat.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                        animate={{ y: [0, -4, 0] }}
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

      {/* Input Area */}
      {isAnnouncement && !isAdmin ? (
        <div className="bg-muted/50 p-4 text-center text-xs text-muted-foreground border-t border-border">
          Only admins can send messages in this group.
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 bg-background border-t border-border p-4"
        >
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground hover:text-primary shrink-0"
            >
              <Image className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGifPicker(!showGifPicker)}
              className="text-muted-foreground hover:text-secondary shrink-0"
            >
              <span className="text-sm font-bold">GIF</span>
            </Button>
            <div className="flex-1 relative">
              <Input
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="pr-10 bg-card border-border focus:border-primary"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${showEmojiPicker ? "text-primary" : "text-muted-foreground"} hover:text-primary`}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}

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
    </motion.div>
  );
};

export default ChatView;
