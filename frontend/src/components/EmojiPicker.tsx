import { useState, useEffect, useRef } from "react";
import { devError } from "../utils/devLog";
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
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const EMOJI_NAMES: Record<string, string[]> = {
  "😀": ["grinning", "smile", "happy"],
  "😃": ["smiley", "happy", "joy"],
  "😄": ["smile", "happy", "glad"],
  "😁": ["grin", "happy", "beam"],
  "😆": ["laughing", "happy", "haha"],
  "😅": ["sweat", "smile", "nervous"],
  "😂": ["joy", "tears", "laugh", "lol", "funny"],
  "🤣": ["rofl", "laugh", "rolling", "funny"],
  "🥲": ["smiling", "tear", "sad", "happy"],
  "😊": ["blush", "smile", "happy", "shy"],
  "😇": ["angel", "innocent", "halo"],
  "🙂": ["slight", "smile"],
  "🙃": ["upside", "down", "sarcasm"],
  "😉": ["wink", "flirt"],
  "😌": ["relieved", "calm", "peace"],
  "😍": ["heart", "eyes", "love", "crush"],
  "🥰": ["love", "hearts", "adore", "affection"],
  "😘": ["kiss", "love", "blow"],
  "😗": ["kiss", "smooch"],
  "😙": ["kiss", "smile"],
  "😚": ["kiss", "blush", "shy"],
  "😋": ["yummy", "delicious", "tongue", "food"],
  "😛": ["tongue", "playful"],
  "😝": ["tongue", "squint", "playful"],
  "😜": ["wink", "tongue", "crazy"],
  "🤪": ["crazy", "wild", "zany"],
  "🤨": ["raised", "eyebrow", "skeptical", "suspicious"],
  "🧐": ["monocle", "curious", "thinking"],
  "🤓": ["nerd", "glasses", "geek"],
  "😎": ["cool", "sunglasses", "awesome"],
  "🥸": ["disguise", "glasses", "mustache"],
  "🤩": ["star", "eyes", "excited", "amazing", "wow"],
  "🥳": ["party", "celebrate", "birthday", "hat"],
  "😏": ["smirk", "sly", "suggestive"],
  "😒": ["unamused", "annoyed", "bored"],
  "😞": ["disappointed", "sad"],
  "😔": ["pensive", "sad", "thoughtful"],
  "😟": ["worried", "concerned"],
  "😕": ["confused", "unsure"],
  "🙁": ["frown", "sad", "unhappy"],
  "☹️": ["frown", "sad"],
  "😣": ["persevere", "struggle"],
  "😖": ["confounded", "frustrated"],
  "😫": ["tired", "exhausted"],
  "😩": ["weary", "tired", "sad"],
  "🥺": ["pleading", "puppy", "eyes", "please", "cute"],
  "😢": ["cry", "sad", "tear"],
  "😭": ["sob", "cry", "loud", "sad", "bawling"],
  "😤": ["angry", "huff", "steam", "mad"],
  "😠": ["angry", "mad", "grumpy"],
  "😡": ["rage", "angry", "mad", "furious"],
  "🤬": ["swearing", "cursing", "angry", "mad"],
  "🤯": ["exploding", "head", "mind", "blown", "shocked"],
  "😳": ["flushed", "embarrassed", "surprised", "shocked"],
  "🥵": ["hot", "heat", "sweating"],
  "🥶": ["cold", "freezing", "ice"],
  "😱": ["scream", "scared", "horror", "shocked"],
  "😨": ["fearful", "scared", "afraid"],
  "😰": ["anxious", "sweat", "nervous"],
  "😥": ["disappointed", "relieved", "sad"],
  "😓": ["downcast", "sweat", "tired"],
  "🤗": ["hug", "hugging", "warm"],
  "🤔": ["thinking", "hmm", "wonder", "consider"],
  "🤭": ["giggle", "cover", "mouth", "oops"],
  "🤫": ["shush", "quiet", "secret"],
  "🤥": ["lying", "pinocchio", "liar"],
  "😶": ["mute", "silent", "speechless"],
  "😐": ["neutral", "blank", "expressionless"],
  "😑": ["expressionless", "blank"],
  "😬": ["grimace", "awkward", "cringe"],
  "🙄": ["eye", "roll", "whatever", "annoyed"],
  "😯": ["hushed", "surprised", "wow"],
  "😦": ["frown", "open", "mouth"],
  "😧": ["anguished", "shocked"],
  "😮": ["open", "mouth", "surprised", "wow", "oh"],
  "😲": ["astonished", "shocked", "surprised", "wow"],
  "🥱": ["yawn", "tired", "bored", "sleepy"],
  "😴": ["sleeping", "zzz", "tired", "sleep"],
  "🤤": ["drool", "hungry", "yummy"],
  "😪": ["sleepy", "tired"],
  "😵": ["dizzy", "confused", "knocked"],
  "🤐": ["zipper", "mouth", "quiet", "secret"],
  "🥴": ["woozy", "drunk", "tipsy"],
  "🤢": ["nauseous", "sick", "green"],
  "🤮": ["vomit", "sick", "throw", "up"],
  "🤧": ["sneeze", "sick", "cold", "tissue"],
  "😷": ["mask", "sick", "medical", "covid"],
  "🤒": ["thermometer", "sick", "fever"],
  "🤕": ["bandage", "hurt", "injured"],
  "🤑": ["money", "rich", "dollar"],
  "🤠": ["cowboy", "hat", "western"],
  "😈": ["devil", "evil", "horns", "naughty"],
  "👿": ["devil", "angry", "evil"],
  "👹": ["ogre", "monster", "japanese"],
  "👺": ["goblin", "monster", "japanese"],
  "🤡": ["clown", "funny", "circus"],
  "💩": ["poop", "poo", "shit"],
  "👻": ["ghost", "halloween", "boo", "spooky"],
  "💀": ["skull", "death", "dead"],
  "☠️": ["skull", "crossbones", "death", "danger"],
  "👽": ["alien", "ufo", "space"],
  "👾": ["alien", "monster", "game", "space"],
  "🤖": ["robot", "machine", "bot"],
  "🎃": ["pumpkin", "halloween", "jack"],
  "😺": ["cat", "smile", "happy"],
  "😸": ["cat", "grin", "happy"],
  "😹": ["cat", "joy", "tears", "laugh"],
  "😻": ["cat", "heart", "eyes", "love"],
  "😼": ["cat", "smirk", "wry"],
  "😽": ["cat", "kiss"],
  "❤️": ["red", "heart", "love"],
  "🧡": ["orange", "heart", "love"],
  "💛": ["yellow", "heart", "love"],
  "💚": ["green", "heart", "love"],
  "💙": ["blue", "heart", "love"],
  "💜": ["purple", "heart", "love"],
  "🖤": ["black", "heart", "love", "dark"],
  "🤍": ["white", "heart", "love", "pure"],
  "🤎": ["brown", "heart", "love"],
  "💔": ["broken", "heart", "sad", "heartbreak"],
  "❣️": ["heart", "exclamation", "love"],
  "💕": ["two", "hearts", "love"],
  "💞": ["revolving", "hearts", "love"],
  "💓": ["heartbeat", "love"],
  "💗": ["growing", "heart", "love"],
  "💖": ["sparkling", "heart", "love"],
  "💘": ["cupid", "arrow", "heart", "love"],
  "💝": ["gift", "heart", "love", "ribbon"],
  "💟": ["heart", "decoration", "love"],
  "♥️": ["heart", "suit", "love", "card"],
  "💌": ["love", "letter", "mail", "envelope"],
  "💋": ["kiss", "lips", "love"],
  "👄": ["lips", "mouth", "kiss"],
  "👅": ["tongue", "lick", "taste"],
  "🫦": ["biting", "lip", "nervous", "flirty"],
  "💐": ["bouquet", "flowers", "gift"],
  "🌹": ["rose", "flower", "love", "romantic"],
  "🥀": ["wilted", "flower", "rose", "sad", "dead"],
  "🌷": ["tulip", "flower", "spring"],
  "🌺": ["hibiscus", "flower", "tropical"],
  "🌸": ["cherry", "blossom", "flower", "spring", "sakura"],
  "💮": ["white", "flower"],
  "🏵️": ["rosette", "flower"],
  "🪷": ["lotus", "flower", "zen"],
  "🪻": ["hyacinth", "flower", "purple"],
  "💒": ["wedding", "church", "love", "marriage"],
  "👍": ["thumbs", "up", "good", "like", "yes", "ok", "approve"],
  "👎": ["thumbs", "down", "bad", "dislike", "no", "disapprove"],
  "👌": ["ok", "perfect", "fine", "good"],
  "🤌": ["pinched", "fingers", "italian"],
  "🤏": ["pinching", "small", "tiny", "little"],
  "✌️": ["peace", "victory", "two"],
  "🤞": ["crossed", "fingers", "luck", "hope"],
  "🤟": ["love", "you", "rock"],
  "🤘": ["rock", "metal", "horns"],
  "🤙": ["call", "me", "shaka", "hang", "loose"],
  "👈": ["point", "left"],
  "👉": ["point", "right"],
  "👆": ["point", "up"],
  "🖕": ["middle", "finger", "fuck"],
  "👇": ["point", "down"],
  "☝️": ["point", "up", "one"],
  "👋": ["wave", "hello", "bye", "hi", "goodbye"],
  "🤚": ["raised", "hand", "stop"],
  "🖐️": ["hand", "fingers", "five", "high"],
  "✋": ["hand", "stop", "high", "five"],
  "🖖": ["vulcan", "spock", "star", "trek"],
  "👏": ["clap", "bravo", "applause", "congrats"],
  "🙌": ["raised", "hands", "celebrate", "hooray", "praise"],
  "🫶": ["heart", "hands", "love", "care"],
  "👐": ["open", "hands", "hug"],
  "🤲": ["palms", "up", "prayer"],
  "🤝": ["handshake", "deal", "agreement"],
  "🙏": ["pray", "please", "thanks", "namaste", "hope"],
  "✍️": ["writing", "pen", "hand"],
  "💅": ["nail", "polish", "beauty", "sassy"],
  "🤳": ["selfie", "phone", "camera"],
  "💪": ["muscle", "strong", "flex", "bicep", "power"],
  "👀": ["eyes", "look", "see", "watching"],
  "🔥": ["fire", "hot", "lit", "flame"],
  "🎉": ["party", "celebrate", "tada", "congrats", "confetti"],
  "🎊": ["confetti", "ball", "party", "celebrate"],
  "🎈": ["balloon", "party", "birthday"],
  "🎁": ["gift", "present", "birthday", "christmas"],
  "🎂": ["birthday", "cake", "party"],
  "🍰": ["cake", "shortcake", "dessert"],
  "🧁": ["cupcake", "dessert", "sweet"],
  "🎄": ["christmas", "tree", "holiday"],
  "🎅": ["santa", "christmas", "holiday"],
  "✨": ["sparkles", "stars", "magic", "shine", "glitter"],
  "🏆": ["trophy", "winner", "champion", "award"],
  "🥇": ["gold", "medal", "first", "winner"],
  "🥈": ["silver", "medal", "second"],
  "🥉": ["bronze", "medal", "third"],
  "💯": ["hundred", "perfect", "score", "100"],
  "🍕": ["pizza", "food", "cheese"],
  "🍔": ["burger", "hamburger", "food"],
  "🍟": ["fries", "french", "food", "mcdonalds"],
  "☕": ["coffee", "hot", "drink", "cafe"],
  "🍵": ["tea", "green", "drink"],
  "🍺": ["beer", "drink", "cheers"],
  "🍻": ["beers", "cheers", "drink", "toast"],
  "🥂": ["champagne", "cheers", "toast", "celebrate"],
  "🍷": ["wine", "drink", "glass"],
  "⚽": ["soccer", "football", "sport", "ball"],
  "🏀": ["basketball", "sport", "ball"],
  "🎮": ["game", "gaming", "controller", "video"],
  "🎯": ["target", "dart", "bullseye", "goal"],
  "🌍": ["earth", "world", "globe", "planet"],
  "🌈": ["rainbow", "pride", "colorful"],
  "⭐": ["star", "favorite", "best"],
  "🌙": ["moon", "night", "crescent"],
  "☀️": ["sun", "sunny", "bright", "day"],
};

const EMOJI_CATEGORIES = {
  recent: {
    icon: Clock,
    label: "Recent",
    emojis: [] as string[],
  },
  smileys: {
    icon: Smile,
    label: "Smileys",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "🥲",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "😗",
      "😙",
      "😚",
      "😋",
      "😛",
      "😝",
      "😜",
      "🤪",
      "🤨",
      "🧐",
      "🤓",
      "😎",
      "🥸",
      "🤩",
      "🥳",
      "😏",
      "😒",
      "😞",
      "😔",
      "😟",
      "😕",
      "🙁",
      "☹️",
      "😣",
      "😖",
      "😫",
      "😩",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "🤯",
      "😳",
      "🥵",
      "🥶",
      "😱",
      "😨",
      "😰",
      "😥",
      "😓",
      "🤗",
      "🤔",
      "🤭",
      "🤫",
      "🤥",
      "😶",
      "😐",
      "😑",
      "😬",
      "🙄",
      "😯",
      "😦",
      "😧",
      "😮",
      "😲",
      "🥱",
      "😴",
      "🤤",
      "😪",
      "😵",
      "🤐",
      "🥴",
      "🤢",
      "🤮",
      "🤧",
      "😷",
      "🤒",
      "🤕",
      "🤑",
      "🤠",
      "😈",
      "👿",
      "👹",
      "👺",
      "🤡",
      "💩",
      "👻",
      "💀",
      "☠️",
      "👽",
      "👾",
      "🤖",
      "🎃",
      "😺",
      "😸",
      "😹",
      "😻",
      "😼",
      "😽",
    ],
  },
  love: {
    icon: Heart,
    label: "Love",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "♥️",
      "💌",
      "💋",
      "👄",
      "👅",
      "🫦",
      "💑",
      "👩‍❤️‍👨",
      "👨‍❤️‍👨",
      "👩‍❤️‍👩",
      "💏",
      "👩‍❤️‍💋‍👨",
      "👨‍❤️‍💋‍👨",
      "👩‍❤️‍💋‍👩",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😚",
      "😻",
      "💐",
      "🌹",
      "🥀",
      "🌷",
      "🌺",
      "🌸",
      "💮",
      "🏵️",
      "🪷",
      "🪻",
      "💒",
    ],
  },
  gestures: {
    icon: ThumbsUp,
    label: "Gestures",
    emojis: [
      "👍",
      "👎",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👏",
      "🙌",
      "🫶",
      "👐",
      "🤲",
      "🤝",
      "🙏",
      "✍️",
      "💅",
      "🤳",
      "💪",
      "🦾",
      "🦿",
      "🦵",
      "🦶",
      "👂",
      "🦻",
      "👃",
      "🧠",
      "🫀",
      "🫁",
      "🦷",
      "🦴",
      "👀",
      "👁️",
      "👅",
      "👄",
      "🫦",
      "👶",
      "🧒",
      "👦",
      "👧",
      "🧑",
      "👱",
      "👨",
      "🧔",
      "👩",
      "🧓",
      "👴",
    ],
  },
  sad: {
    icon: Frown,
    label: "Sad",
    emojis: [
      "😢",
      "😭",
      "😿",
      "😞",
      "😔",
      "😟",
      "😕",
      "🙁",
      "☹️",
      "😣",
      "😖",
      "😫",
      "😩",
      "🥺",
      "😥",
      "😰",
      "😓",
      "💔",
      "🥀",
      "🖤",
      "😪",
      "😴",
      "🤕",
      "🤒",
      "😷",
      "🤧",
      "😵",
      "🥴",
      "😶",
      "😐",
      "😑",
      "🫥",
      "😬",
      "🫠",
      "🤐",
      "🫡",
      "🤫",
      "🫣",
      "🤭",
      "🫢",
    ],
  },
  celebration: {
    icon: PartyPopper,
    label: "Celebration",
    emojis: [
      "🎉",
      "🎊",
      "🥳",
      "🎈",
      "🎁",
      "🎀",
      "🎂",
      "🍰",
      "🧁",
      "🎃",
      "🎄",
      "🎅",
      "🤶",
      "🧑‍🎄",
      "🎆",
      "🎇",
      "🧨",
      "✨",
      "🎏",
      "🎐",
      "🎋",
      "🎍",
      "🎎",
      "🎑",
      "🎀",
      "🎗️",
      "🏆",
      "🥇",
      "🥈",
      "🥉",
      "🏅",
      "🎖️",
      "🎭",
      "🎨",
      "🎬",
      "🎤",
      "🎧",
      "🎼",
      "🎹",
      "🥁",
    ],
  },
  nature: {
    icon: Sun,
    label: "Nature",
    emojis: [
      "🌸",
      "💐",
      "🌷",
      "🌹",
      "🥀",
      "🌺",
      "🌻",
      "🌼",
      "🌱",
      "🪴",
      "🌲",
      "🌳",
      "🌴",
      "🌵",
      "🌾",
      "🌿",
      "☘️",
      "🍀",
      "🍁",
      "🍂",
      "🍃",
      "🪺",
      "🪹",
      "🐣",
      "🐤",
      "🐥",
      "🦆",
      "🦅",
      "🦉",
      "🦇",
      "🐝",
      "🪲",
      "🐛",
      "🦋",
      "🐌",
      "🐞",
      "🐜",
      "🪳",
      "🦗",
      "🕷️",
      "🌍",
      "🌎",
      "🌏",
      "🌐",
      "🌑",
      "🌒",
      "🌓",
      "🌔",
      "🌕",
      "🌖",
    ],
  },
  food: {
    icon: Coffee,
    label: "Food",
    emojis: [
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🫐",
      "🍈",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥥",
      "🥝",
      "🍅",
      "🍆",
      "🥑",
      "🥦",
      "🍕",
      "🍔",
      "🍟",
      "🌭",
      "🥪",
      "🌮",
      "🌯",
      "🫔",
      "🥙",
      "🧆",
      "☕",
      "🍵",
      "🧃",
      "🥤",
      "🧋",
      "🍶",
      "🍺",
      "🍻",
      "🥂",
      "🍷",
      "🍸",
      "🍹",
      "🧉",
      "🍾",
      "🧊",
      "🥄",
      "🍴",
      "🍽️",
      "🥢",
      "🥡",
    ],
  },
  activities: {
    icon: Zap,
    label: "Activities",
    emojis: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🥎",
      "🎾",
      "🏐",
      "🏉",
      "🥏",
      "🎱",
      "🪀",
      "🏓",
      "🏸",
      "🏒",
      "🏑",
      "🥍",
      "🏏",
      "🪃",
      "🥅",
      "⛳",
      "🎯",
      "🪁",
      "🎣",
      "🤿",
      "🎽",
      "🎿",
      "🛷",
      "🥌",
      "🎮",
      "🕹️",
      "🎰",
      "🎲",
      "🧩",
      "🃏",
      "🀄",
      "🎴",
      "🎭",
      "🎨",
      "🧵",
      "🪡",
    ],
  },
};

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "🎉", "💯"];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
  showQuickReactions?: boolean;
}

const EmojiPicker = ({
  onSelect,
  onClose,
  position,
  showQuickReactions = true,
}: EmojiPickerProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("smileys");
  const [searchQuery, setSearchQuery] = useState("");
  // const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("recentEmojis");
      if (stored) {
        return JSON.parse(stored).slice(0, 20);
      }
    } catch (e) {
      devError("Failed to parse recent emojis:", e);
    }
    return [];
  });

  // useEffect(() => {
  //   const stored = localStorage.getItem("recentEmojis");
  //   if (stored) {
  //     try {
  //       const parsed = JSON.parse(stored);
  //       setRecentEmojis(parsed.slice(0, 20));
  //     } catch (e) {
  //       devError("Failed to parse recent emojis:", e);
  //     }
  //   }
  // }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    const newRecent = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(
      0,
      20,
    );
    setRecentEmojis(newRecent);
    localStorage.setItem("recentEmojis", JSON.stringify(newRecent));
    onSelect(emoji);
    onClose();
  };

  const getAllEmojis = () => {
    return Object.values(EMOJI_CATEGORIES).flatMap((cat) => cat.emojis);
  };

  const getFilteredEmojis = () => {
    if (!searchQuery.trim()) {
      if (selectedCategory === "recent") return recentEmojis;
      return (
        EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]
          ?.emojis || []
      );
    }

    const query = searchQuery.toLowerCase().trim();
    const allEmojis = getAllEmojis();

    // Search by name/keyword using EMOJI_NAMES mapping
    const matched = new Set<string>();

    // First: check emoji names mapping
    for (const [emoji, names] of Object.entries(EMOJI_NAMES)) {
      if (names.some((name) => name.includes(query))) {
        matched.add(emoji);
      }
    }

    // Second: also check if any emoji in our categories matches directly
    allEmojis.forEach((emoji) => {
      if (emoji.includes(searchQuery)) {
        matched.add(emoji);
      }
    });

    // Return matched emojis preserving category order
    return allEmojis.filter((emoji) => matched.has(emoji));
  };

  const filteredEmojis = getFilteredEmojis();

  // Get display name for hovered emoji
  const getEmojiName = (emoji: string): string => {
    const names = EMOJI_NAMES[emoji];
    if (names && names.length > 0) {
      return names[0].charAt(0).toUpperCase() + names[0].slice(1);
    }
    return "Emoji";
  };

  const getPositionStyle = () => {
    if (!position) return { bottom: "100%", left: "0", marginBottom: "8px" };

    const padding = 16;
    const pickerWidth = 360;
    const pickerHeight = 420;

    let left = position.x;
    let top = position.y;

    if (left + pickerWidth > window.innerWidth - padding) {
      left = window.innerWidth - pickerWidth - padding;
    }
    if (left < padding) left = padding;

    if (top + pickerHeight > window.innerHeight - padding) {
      top = position.y - pickerHeight - 10;
    }

    return { left: `${left}px`, top: `${top}px` };
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/15 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Emoji Picker Container */}
      <div
        ref={containerRef}
        className="fixed z-[110] bg-white border-2 border-stone-200 rounded-2xl shadow-2xl w-[360px] animate-in fade-in zoom-in duration-200 origin-bottom-left"
        style={getPositionStyle()}
      >
        {/* Quick Reactions Bar - fixed overflow */}
        {showQuickReactions && (
          <div className="p-2 border-b-2 border-stone-200 bg-amber-50/50">
            <div className="flex items-center justify-center gap-0.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  onMouseEnter={() => setHoveredEmoji(emoji)}
                  onMouseLeave={() => setHoveredEmoji(null)}
                  className={`text-xl p-1.5 rounded-lg transition-all duration-200 hover:bg-amber-100 flex-shrink-0 ${
                    hoveredEmoji === emoji ? "scale-125 bg-amber-100" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Header with Search */}
        <div className="p-3 border-b-2 border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-700 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emojis... (try: happy, love, fire)"
              className="pl-10 bg-stone-50 border-2 border-stone-200 focus:border-teal-400 h-10 rounded-xl text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex gap-1 p-2 border-b-2 border-stone-200 overflow-x-auto scrollbar-none">
            {recentEmojis.length > 0 && (
              <button
                onClick={() => setSelectedCategory("recent")}
                className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 ${
                  selectedCategory === "recent"
                    ? "bg-teal-600 text-white shadow-lg"
                    : "hover:bg-stone-100 text-stone-500"
                }`}
                title="Recent"
              >
                <Clock className="h-4 w-4" />
              </button>
            )}
            {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
              if (key === "recent") return null;
              const Icon = category.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 ${
                    selectedCategory === key
                      ? "bg-teal-600 text-white shadow-lg"
                      : "hover:bg-stone-100 text-stone-500"
                  }`}
                  title={category.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        )}

        {/* Category / Search Label */}
        <div className="px-3 py-2 bg-stone-50">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">
            {searchQuery
              ? `${filteredEmojis.length} results for "${searchQuery}"`
              : selectedCategory === "recent"
                ? "Recently Used"
                : EMOJI_CATEGORIES[
                    selectedCategory as keyof typeof EMOJI_CATEGORIES
                  ]?.label || selectedCategory}
          </p>
        </div>

        {/* Emoji Grid */}
        <div className="p-2 h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent">
          {filteredEmojis.length > 0 ? (
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  onClick={() => handleEmojiClick(emoji)}
                  onMouseEnter={() => setHoveredEmoji(emoji)}
                  onMouseLeave={() => setHoveredEmoji(null)}
                  className={`text-2xl p-2 rounded-xl transition-all duration-150 hover:bg-teal-50 active:scale-90 ${
                    hoveredEmoji === emoji ? "bg-teal-50 scale-110" : ""
                  }`}
                  title={getEmojiName(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-3">
                <Search className="h-8 w-8 text-stone-400" />
              </div>
              <p className="text-stone-700 font-semibold mb-1">
                No emojis found
              </p>
              <p className="text-stone-500 text-sm">
                Try: happy, love, fire, sad, party
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t-2 border-stone-200 bg-stone-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              {hoveredEmoji ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-lg">{hoveredEmoji}</span>
                  <span className="font-medium">
                    {getEmojiName(hoveredEmoji)}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Select an emoji to react</span>
                </span>
              )}
            </p>
            <p className="text-xs text-stone-500">
              {filteredEmojis.length} emojis
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmojiPicker;
