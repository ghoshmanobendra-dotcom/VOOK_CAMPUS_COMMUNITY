import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, FileText, Music, Video, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  type: "text" | "image" | "gif" | "video" | "audio" | "file";
  sender: "me" | "them";
  timestamp: string;
  status: "sent" | "delivered" | "read";
  reactions?: string[];
  senderName?: string;
  fileName?: string;
}

interface MessageBubbleProps {
  message: Message;
  isSelected: boolean;
  onLongPress: () => void;
  onDoubleClick?: () => void;
  onReaction: (emoji: string) => void;
  emojiReactions: string[];
  index: number;
}

const MessageBubble = ({
  message,
  isSelected,
  onLongPress,
  onDoubleClick,
  onReaction,
  emojiReactions,
  index,
}: MessageBubbleProps) => {
  const isMe = message.sender === "me";

  const getStatusIcon = () => {
    switch (message.status) {
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground/70" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground/70" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  const getSenderColor = (name: string) => {
    const colors = [
      "text-red-500", "text-orange-500", "text-amber-500", "text-green-500",
      "text-emerald-500", "text-teal-500", "text-cyan-500", "text-blue-500",
      "text-indigo-500", "text-violet-500", "text-purple-500", "text-fuchsia-500",
      "text-pink-500", "text-rose-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split('/');
      return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
    } catch (e) {
      return "Attachment";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={cn("flex flex-col mb-1 relative transition-colors duration-200",
        isMe ? "items-end" : "items-start",
        isSelected && "bg-primary/10 -mx-4 px-4 py-1" // Highlight container
      )}
    >
      <div className={cn("relative max-w-[85%] md:max-w-[70%]", isMe ? "flex flex-col items-end" : "flex flex-col items-start")}>
        {/* Reaction Picker - Only show if specifically requested via long press, or changing logic */}
        <AnimatePresence>
          {isSelected && false && ( // Disabled default popup for now, handled by parent or different UI if selection is for actions
            <motion.div
            // ... 
            />
          )}
        </AnimatePresence>

        {/* Sender Name for Groups */}
        {!isMe && message.senderName && (
          <span className={cn("text-[11px] font-semibold mb-1 ml-3", getSenderColor(message.senderName))}>
            {message.senderName}
          </span>
        )}

        {/* Message Bubble */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onContextMenu={(e) => {
            e.preventDefault();
            onLongPress();
          }}
          onClick={onLongPress} // Keep single click for reaction/details if needed, user said double click for selection
          onDoubleClick={onDoubleClick}
          className={cn(
            "relative shadow-sm group cursor-pointer",
            message.type === "text" ? "px-4 py-2" : "p-1.5",
            isMe
              ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-md"
              : "bg-card text-foreground border border-border/50 rounded-2xl rounded-tl-md",
            isSelected && "ring-2 ring-primary ring-offset-1" // Ring for selection visibility on the bubble itself
          )}
        >
          {message.type === "text" && (
            <div className="flex flex-col">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <div className={cn("flex items-center gap-1 mt-1 select-none opacity-70", isMe ? "justify-end text-primary-foreground/80" : "justify-end text-muted-foreground")}>
                <span className="text-[10px]">{message.timestamp}</span>
                {isMe && <span className="opacity-90">{getStatusIcon()}</span>}
              </div>
            </div>
          )}

          {message.type === "image" && (
            <div className="relative">
              <img
                src={message.content}
                alt="Shared"
                className="rounded-xl max-w-full max-h-80 object-cover"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full text-white/90">
                <span className="text-[10px]">{message.timestamp}</span>
                {isMe && <span>{getStatusIcon()}</span>}
              </div>
            </div>
          )}

          {message.type === "gif" && (
            <div className="relative">
              <img
                src={message.content}
                alt="GIF"
                className="rounded-xl max-w-full max-h-60 object-cover"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full text-white/90">
                <span className="text-[10px]">{message.timestamp}</span>
                {isMe && <span>{getStatusIcon()}</span>}
              </div>
            </div>
          )}

          {message.type === "video" && (
            <div className="flex flex-col gap-1 min-w-[200px]">
              <div className="relative rounded-lg overflow-hidden bg-black/10">
                <video src={message.content} controls className="max-w-full max-h-60 rounded-lg" />
              </div>
              <div className={cn("flex items-center gap-1 justify-end px-1 opacity-70 text-[10px]", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                <span>{message.timestamp}</span>
                {isMe && <span>{getStatusIcon()}</span>}
              </div>
            </div>
          )}

          {message.type === "audio" && (
            <div className="flex flex-col gap-1 min-w-[250px] p-1">
              <div className="flex items-center gap-2 p-2 bg-background/10 rounded-lg">
                <Music className="h-6 w-6" />
                <audio src={message.content} controls className="h-8 w-full max-w-[200px]" />
              </div>
              <div className={cn("flex items-center gap-1 justify-end px-1 opacity-70 text-[10px]", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                <span>{message.timestamp}</span>
                {isMe && <span>{getStatusIcon()}</span>}
              </div>
            </div>
          )}

          {message.type === "file" && (
            <div className="flex flex-col gap-1 min-w-[200px]">
              <a href={message.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-background/10 rounded-xl hover:bg-background/20 transition-colors">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate max-w-[150px]">{message.fileName || getFileName(message.content)}</span>
                  <span className="text-[10px] opacity-70">Click to open</span>
                </div>
                <Download className="h-4 w-4 opacity-50 ml-auto" />
              </a>
              <div className={cn("flex items-center gap-1 justify-end px-1 opacity-70 text-[10px]", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                <span>{message.timestamp}</span>
                {isMe && <span>{getStatusIcon()}</span>}
              </div>
            </div>
          )}

        </motion.div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn("absolute -bottom-2 z-10", isMe ? "right-2" : "left-2")}
          >
            <div className="flex gap-0.5 bg-card/90 backdrop-blur rounded-full px-2 py-0.5 border border-border shadow-sm text-xs">
              {message.reactions.map((reaction, i) => (
                <span key={i}>
                  {reaction}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
