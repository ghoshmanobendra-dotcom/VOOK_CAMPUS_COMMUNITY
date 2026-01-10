import { motion } from "framer-motion";
import { MessageCircle, Users, MapPin, Calendar, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatUser {
  id: string;
  name: string;
  initials: string;
  color: string;
  isOnline?: boolean;
  isVerified?: boolean;
  lastSeen?: string;
  bio?: string;
  mutualFriends?: number;
}

interface ProfileQuickViewProps {
  user: ChatUser;
  open: boolean;
  onClose: () => void;
}

const ProfileQuickView = ({ user, open, onClose }: ProfileQuickViewProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm mx-4 p-0 overflow-hidden">
        {/* Header with gradient */}
        <div
          className="h-24 relative"
          style={{
            background: `linear-gradient(135deg, ${user.color}, ${user.color}80)`,
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="absolute -bottom-10 left-1/2 -translate-x-1/2"
          >
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-card">
                <AvatarFallback
                  style={{ backgroundColor: user.color }}
                  className="text-foreground font-bold text-2xl"
                >
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              {user.isOnline && (
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-primary border-2 border-card" />
              )}
            </div>
          </motion.div>
        </div>

        <div className="pt-12 pb-6 px-6 text-center space-y-4">
          <div>
            <h2 className="text-xl font-bold font-['Outfit'] text-foreground flex items-center justify-center gap-1">
              {user.name}
              {user.isVerified && (
                <span className="text-primary text-sm">✓ Verified</span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {user.isOnline ? "🟢 Online now" : `Last seen ${user.lastSeen || "recently"}`}
            </p>
          </div>

          <p className="text-sm text-foreground/80">
            {user.bio || "Computer Science enthusiast | Tech Club member | Always learning something new 🚀"}
          </p>

          <div className="flex items-center justify-center gap-6 py-2">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{user.mutualFriends || 12}</p>
              <p className="text-xs text-muted-foreground">Mutual Friends</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">CSE</p>
              <p className="text-xs text-muted-foreground">Department</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">2024</p>
              <p className="text-xs text-muted-foreground">Batch</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Hostel 3, Room 204</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Joined September 2022</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Full Profile
            </Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileQuickView;
