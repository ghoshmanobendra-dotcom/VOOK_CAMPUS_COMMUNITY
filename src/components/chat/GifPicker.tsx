import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// Sample GIF URLs (in production, these would come from a GIF API like Giphy)
const trendingGifs = [
  "https://media.giphy.com/media/3oEjHI8WJv4x6UPDB6/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif",
  "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
  "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
  "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  "https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif",
];

const categories = ["Trending", "Reactions", "Celebration", "Love", "Funny"];

const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Trending");

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute bottom-20 left-0 right-0 bg-card border-t border-border rounded-t-2xl shadow-lg max-h-[60vh] overflow-hidden"
    >
      {/* Header */}
      <div className="sticky top-0 bg-card z-10 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground font-['Outfit']">Choose a GIF</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-border focus:border-primary"
          />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <motion.button
              key={category}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {category}
            </motion.button>
          ))}
        </div>
      </div>

      {/* GIF Grid */}
      <div className="p-4 grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto scrollbar-hide">
        {trendingGifs.map((gif, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(gif)}
            className="relative overflow-hidden rounded-lg aspect-square bg-muted"
          >
            <img
              src={gif}
              alt={`GIF ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </motion.button>
        ))}
      </div>

      {/* Powered by text */}
      <div className="p-2 text-center border-t border-border">
        <span className="text-xs text-muted-foreground">Powered by GIPHY</span>
      </div>
    </motion.div>
  );
};

export default GifPicker;
