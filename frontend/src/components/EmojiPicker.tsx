import { useState, useEffect, useRef } from "react";
import { 
  Smile, 
  X, 
  Heart, 
  ThumbsUp, 
  Frown, 
  Clock, 
  Search,
  Sparkles,
  PartyPopper,
  Coffee,
  Sun,
  Zap
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const EMOJI_CATEGORIES = {
  recent: {
    icon: Clock,
    label: "Recent",
    emojis: [] as string[], // Will be populated from localStorage
  },
  smileys: {
    icon: Smile,
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "😊", 
      "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", 
      "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", 
      "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁",
      "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
      "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥",
      "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬",
      "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪",
      "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑",
      "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️",
      "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽"
    ],
  },
  love: {
    icon: Heart,
    label: "Love",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
      "💌", "💋", "👄", "👅", "🫦", "💑", "👩‍❤️‍👨", "👨‍❤️‍👨", "👩‍❤️‍👩", "💏",
      "👩‍❤️‍💋‍👨", "👨‍❤️‍💋‍👨", "👩‍❤️‍💋‍👩", "🥰", "😍", "🤩", "😘", "😚", "😻", "💐",
      "🌹", "🥀", "🌷", "🌺", "🌸", "💮", "🏵️", "🪷", "🪻", "💒"
    ],
  },
  gestures: {
    icon: ThumbsUp,
    label: "Gestures",
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙",
      "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋",
      "🖖", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅",
      "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠",
      "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "🫦", "👶",
      "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👩", "🧓", "👴"
    ],
  },
  sad: {
    icon: Frown,
    label: "Sad",
    emojis: [
      "😢", "😭", "😿", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
      "😖", "😫", "😩", "🥺", "😥", "😰", "😓", "💔", "🥀", "🖤",
      "😪", "😴", "🤕", "🤒", "😷", "🤧", "😵", "🥴", "😶", "😐",
      "😑", "🫥", "😬", "🫠", "🤐", "🫡", "🤫", "🫣", "🤭", "🫢"
    ],
  },
  celebration: {
    icon: PartyPopper,
    label: "Celebration",
    emojis: [
      "🎉", "🎊", "🥳", "🎈", "🎁", "🎀", "🎂", "🍰", "🧁", "🎃",
      "🎄", "🎅", "🤶", "🧑‍🎄", "🎆", "🎇", "🧨", "✨", "🎏", "🎐",
      "🎋", "🎍", "🎎", "🎑", "🎀", "🎗️", "🏆", "🥇", "🥈", "🥉",
      "🏅", "🎖️", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁"
    ],
  },
  nature: {
    icon: Sun,
    label: "Nature",
    emojis: [
      "🌸", "💐", "🌷", "🌹", "🥀", "🌺", "🌻", "🌼", "🌱", "🪴",
      "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂",
      "🍃", "🪺", "🪹", "🐣", "🐤", "🐥", "🦆", "🦅", "🦉", "🦇",
      "🐝", "🪲", "🐛", "🦋", "🐌", "🐞", "🐜", "🪳", "🦗", "🕷️",
      "🌍", "🌎", "🌏", "🌐", "🌑", "🌒", "🌓", "🌔", "🌕", "🌖"
    ],
  },
  food: {
    icon: Coffee,
    label: "Food",
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈",
      "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦",
      "🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆",
      "☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷",
      "🍸", "🍹", "🧉", "🍾", "🧊", "🥄", "🍴", "🍽️", "🥢", "🥡"
    ],
  },
  activities: {
    icon: Zap,
    label: "Activities",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱",
      "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳",
      "🎯", "🪁", "🎣", "🤿", "🎽", "🎿", "🛷", "🥌", "🎮", "🕹️",
      "🎰", "🎲", "🧩", "🃏", "🀄", "🎴", "🎭", "🎨", "🧵", "🪡"
    ],
  },
};

// Quick reaction emojis for fast access
const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥", "🎉", "💯"];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
  showQuickReactions?: boolean;
}

const EmojiPicker = ({ onSelect, onClose, position, showQuickReactions = true }: EmojiPickerProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("smileys");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentEmojis");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentEmojis(parsed.slice(0, 20));
      } catch (e) {
        console.error("Failed to parse recent emojis:", e);
      }
    }
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    // Update recent emojis
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 20);
    setRecentEmojis(newRecent);
    localStorage.setItem("recentEmojis", JSON.stringify(newRecent));
    
    onSelect(emoji);
    onClose();
  };

  // Get all emojis for search
  const getAllEmojis = () => {
    return Object.values(EMOJI_CATEGORIES).flatMap(cat => cat.emojis);
  };

  // Filter emojis based on search
  const getFilteredEmojis = () => {
    if (!searchQuery.trim()) {
      if (selectedCategory === "recent") {
        return recentEmojis;
      }
      return EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.emojis || [];
    }
    
    // For search, return all matching emojis
    return getAllEmojis().filter(emoji => 
      emoji.includes(searchQuery) || 
      searchQuery.includes(emoji)
    );
  };

  const filteredEmojis = getFilteredEmojis();

  // Calculate position to stay within viewport
  const getPositionStyle = () => {
    if (!position) return { bottom: "100%", left: "0", marginBottom: "8px" };
    
    const padding = 16;
    const pickerWidth = 360;
    const pickerHeight = 420;
    
    let left = position.x;
    let top = position.y;
    
    // Adjust horizontal position
    if (left + pickerWidth > window.innerWidth - padding) {
      left = window.innerWidth - pickerWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }
    
    // Adjust vertical position
    if (top + pickerHeight > window.innerHeight - padding) {
      top = position.y - pickerHeight - 10;
    }
    
    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" 
        onClick={onClose} 
      />
      
      {/* Emoji Picker Container */}
      <div
        ref={containerRef}
        className="fixed z-50 bg-white border-2 border-whatsapp-border rounded-2xl shadow-2xl w-[360px] animate-in fade-in zoom-in duration-200 origin-bottom-left"
        style={getPositionStyle()}
      >
        {/* Quick Reactions Bar */}
        {showQuickReactions && (
          <div className="p-3 border-b-2 border-whatsapp-border bg-gradient-to-r from-whatsapp-light/50 to-white">
            <div className="flex items-center justify-between gap-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  onMouseEnter={() => setHoveredEmoji(emoji)}
                  onMouseLeave={() => setHoveredEmoji(null)}
                  className={`text-2xl p-2 rounded-xl transition-all duration-200 hover:bg-whatsapp-green/10 ${
                    hoveredEmoji === emoji ? "scale-125 bg-whatsapp-green/10" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Header with Search */}
        <div className="p-3 border-b-2 border-whatsapp-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-whatsapp-text flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-whatsapp-green" />
              Add Reaction
            </h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-7 w-7 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-whatsapp-secondary" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emojis..."
              className="pl-10 bg-whatsapp-light/50 border-2 border-whatsapp-border focus:border-whatsapp-green h-10 rounded-xl text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-whatsapp-secondary hover:text-whatsapp-text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex gap-1 p-2 border-b-2 border-whatsapp-border overflow-x-auto scrollbar-none">
            {/* Recent Tab */}
            {recentEmojis.length > 0 && (
              <button
                onClick={() => setSelectedCategory("recent")}
                className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 ${
                  selectedCategory === "recent"
                    ? "bg-whatsapp-green text-white shadow-lg"
                    : "hover:bg-whatsapp-light text-whatsapp-secondary"
                }`}
                title="Recent"
              >
                <Clock className="h-4 w-4" />
              </button>
            )}
            
            {/* Category Tabs */}
            {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
              if (key === "recent") return null;
              const Icon = category.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 ${
                    selectedCategory === key
                      ? "bg-whatsapp-green text-white shadow-lg"
                      : "hover:bg-whatsapp-light text-whatsapp-secondary"
                  }`}
                  title={category.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        )}

        {/* Category Label */}
        {!searchQuery && (
          <div className="px-3 py-2 bg-whatsapp-light/30">
            <p className="text-xs font-bold text-whatsapp-secondary uppercase tracking-wide">
              {selectedCategory === "recent" 
                ? "Recently Used" 
                : EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.label || selectedCategory
              }
            </p>
          </div>
        )}

        {/* Search Results Label */}
        {searchQuery && (
          <div className="px-3 py-2 bg-whatsapp-light/30">
            <p className="text-xs font-bold text-whatsapp-secondary">
              {filteredEmojis.length} results for "{searchQuery}"
            </p>
          </div>
        )}

        {/* Emoji Grid */}
        <div className="p-2 h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-whatsapp-border scrollbar-track-transparent">
          {filteredEmojis.length > 0 ? (
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  onClick={() => handleEmojiClick(emoji)}
                  onMouseEnter={() => setHoveredEmoji(emoji)}
                  onMouseLeave={() => setHoveredEmoji(null)}
                  className={`text-2xl p-2 rounded-xl transition-all duration-150 hover:bg-whatsapp-green/10 active:scale-90 ${
                    hoveredEmoji === emoji ? "bg-whatsapp-green/10 scale-110" : ""
                  }`}
                  style={{ 
                    animationDelay: `${index * 10}ms`,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-whatsapp-light rounded-full flex items-center justify-center mb-3">
                <Search className="h-8 w-8 text-whatsapp-secondary" />
              </div>
              <p className="text-whatsapp-text font-semibold mb-1">No emojis found</p>
              <p className="text-whatsapp-secondary text-sm">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer with Skin Tone Hint */}
        <div className="p-2 border-t-2 border-whatsapp-border bg-whatsapp-light/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-whatsapp-secondary">
              {hoveredEmoji ? (
                <span className="flex items-center gap-1">
                  <span className="text-lg">{hoveredEmoji}</span>
                  <span>Click to react</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Select an emoji to react</span>
                </span>
              )}
            </p>
            <p className="text-xs text-whatsapp-secondary">
              {filteredEmojis.length} emojis
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmojiPicker;