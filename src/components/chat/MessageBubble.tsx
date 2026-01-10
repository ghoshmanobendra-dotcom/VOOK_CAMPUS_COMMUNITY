import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";

interface Message {
  id: string;
  content: string;
  type: "text" | "image" | "gif";
  sender: "me" | "them";
  timestamp: string;
  status: "sent" | "delivered" | "read";
  reactions?: string[];
  senderName?: string; // Added for group chats
}

interface MessageBubbleProps {
  message: Message;
  isSelected: boolean;
  onLongPress: () => void;
  onReaction: (emoji: string) => void;
  emojiReactions: string[];
  index: number;
}

const MessageBubble = ({
  message,
  isSelected,
  onLongPress,
  onReaction,
  emojiReactions,
  index,
}: MessageBubbleProps) => {
  const isMe = message.sender === "me";

  const getStatusIcon = () => {
    switch (message.status) {
      case "sent":
        return <Check className="h-3 w-3" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  // Generate a consistent color based on the sender's name
  const getSenderColor = (name: string) => {
    const colors = [
      "text-red-500",
      "text-orange-500",
      "text-amber-500",
      "text-green-500",
      "text-emerald-500",
      "text-teal-500",
      "text-cyan-500",
      "text-blue-500",
      "text-indigo-500",
      "text-violet-500",
      "text-purple-500",
      "text-fuchsia-500",
      "text-pink-500",
      "text-rose-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
    >
      <div className={`relative max-w-[80%] ${isMe ? "flex flex-col items-end" : "flex flex-col items-start"}`}>
        {/* Reaction Picker */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              className={`absolute ${isMe ? "right-0" : "left-0"} -top-12 z-10`}
            >
              <div className="flex gap-1 p-2 bg-card rounded-full border border-border shadow-lg">
                {emojiReactions.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onReaction(emoji)}
                    className="text-lg p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sender Name for Groups */}
        {!isMe && message.senderName && (
          <span className={`text-xs font-semibold mb-1 ml-1 ${getSenderColor(message.senderName)}`}>
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
          onClick={onLongPress}
          className={`rounded-2xl ${isMe
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card text-foreground rounded-bl-md"
            } ${message.type === "text" ? "px-4 py-2" : "p-1"} cursor-pointer relative shadow-sm`}
        >
          {message.type === "text" && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
          {message.type === "image" && (
            <img
              src={message.content}
              alt="Shared image"
              className="rounded-xl max-w-full max-h-60 object-cover"
            />
          )}
          {message.type === "gif" && (
            <img
              src={message.content}
              alt="GIF"
              className="rounded-xl max-w-full max-h-48 object-cover"
            />
          )}
        </motion.div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -bottom-3 ${isMe ? "left-0" : "right-0"}`}
          >
            <div className="flex gap-0.5 bg-card rounded-full px-1.5 py-0.5 border border-border shadow-sm">
              {message.reactions.map((reaction, i) => (
                <span key={i} className="text-xs">
                  {reaction}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timestamp and Status */}
        <div
          className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"
            } ${message.reactions?.length ? "mt-4" : ""}`}
        >
          <span className="text-[10px] text-muted-foreground">{message.timestamp}</span>
          {isMe && <span className="text-muted-foreground">{getStatusIcon()}</span>}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
