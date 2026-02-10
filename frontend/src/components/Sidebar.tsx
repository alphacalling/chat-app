import { useState, useEffect } from "react";
import api from "../apis/api";
import { useSocketContext } from "../context/useSocket";
import { useAuth } from "../context/useAuth";
import UserSearch from "./UserSearch";
import { useNavigate } from "react-router-dom";
import { getSender } from "../utils/chatUtils";
import CreateGroupModal from "./CreateGroupModal";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { 
  Search, 
  MessageSquarePlus, 
  Users, 
  LogOut, 
  Settings,
  MessageCircle,
  Sparkles
} from "lucide-react";
import SettingsModal from "./SettingsModal";
import StatusSection from "./StatusSection";

// Fixed Chat interface
export interface ChatUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  avatar?: string | null;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface ChatMessage {
  id: string;
  content: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string | null;
  };
}

export interface Chat {
  id: string;
  chatName: string | null;
  isGroupChat: boolean;
  avatar?: string | null;
  users: ChatUser[];
  latestMessage: ChatMessage | null;
  updatedAt: string;
}

interface SidebarProps {
  onSelectChat: (chat: Chat) => void;
}

const Sidebar = ({ onSelectChat }: SidebarProps) => {
  const [conversations, setConversations] = useState<Chat[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { onlineUsers, socket, isConnected } = useSocketContext();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Sync current user's name & avatar everywhere (sidebar list, so "You" shows updated profile)
  useEffect(() => {
    if (user?.id && conversations.length > 0) {
      setConversations((prev) =>
        prev.map((chat) => {
          const updatedUsers = chat.users.map((u) =>
            u.id === user.id ? { ...u, name: user.name, avatar: user.avatar } : u
          );
          return { ...chat, users: updatedUsers };
        })
      );
    }
  }, [user?.id, user?.name, user?.avatar]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessageReceived: any) => {
      setConversations((prev) => {
        const chatIndex = prev.findIndex(
          (c) => c.id === newMessageReceived.chatId
        );

        if (chatIndex !== -1) {
          const updatedChats = [...prev];
          const existingChat = updatedChats[chatIndex];

          const updatedChat: Chat = {
            ...existingChat,
            latestMessage: {
              id: newMessageReceived.id || Date.now().toString(),
              content: newMessageReceived.content,
              createdAt: newMessageReceived.createdAt,
              sender: {
                id: newMessageReceived.sender.id,
                name: newMessageReceived.sender.name,
                email: newMessageReceived.sender.email || null,
              },
            },
            updatedAt: new Date().toISOString(),
          };

          updatedChats.splice(chatIndex, 1);
          return [updatedChat, ...updatedChats];
        } else {
          fetchConversations();
          return prev;
        }
      });
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket]);

  const fetchConversations = async () => {
    try {
      if (!user) return;
      const { data } = await api.get("/api/chat/fetch-chat");
      setConversations(data.data || data);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChatId(chat.id);
    onSelectChat(chat);
  };

  const handleStartChat = (newChat: Chat) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === newChat.id);
      if (exists) {
        return [exists, ...prev.filter((c) => c.id !== newChat.id)];
      }
      return [newChat, ...prev];
    });

    handleSelectChat(newChat);
    setShowSearch(false);
  };

  const handleGroupCreated = (newGroup: Chat) => {
    setConversations((prev) => [newGroup, ...prev]);
    handleSelectChat(newGroup);
    setShowCreateGroup(false);
  };

  const formatTime = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const filteredConversations = conversations.filter((chat) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const sender = getSender(user, chat.users);
    const chatName = chat.isGroupChat 
      ? chat.chatName?.toLowerCase() || ""
      : sender?.name?.toLowerCase() || "";
    return chatName.includes(query);
  });

  return (
    <div className="w-full h-full bg-white flex flex-col border-r-2 border-whatsapp-border">
      {/* Premium Header */}
      <div className="p-4 bg-gradient-to-r from-whatsapp-header to-green-700 flex justify-between items-center shrink-0 shadow-lg">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-11 w-11 ring-2 ring-white/30 shadow-lg">
            <AvatarImage 
              src={user?.avatar 
                ? `${user.avatar}${user.avatar.includes('?') ? '&' : '?'}t=${Date.now()}`
                : undefined
              } 
              alt={user?.name}
              key={user?.avatar}
            />
            <AvatarFallback className="bg-white/20 text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm block truncate">
                {user?.name}
              </span>
              <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-full">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-300 animate-pulse" : "bg-red-400"
                  }`}
                />
                <span className="text-xs text-white/90 font-medium">
                  {isConnected ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(true)}
            className="h-10 w-10 hover:bg-white/20 text-white rounded-xl"
            title="New Chat"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCreateGroup(true)}
            className="h-10 w-10 hover:bg-white/20 text-white rounded-xl"
            title="New Group"
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="h-10 w-10 hover:bg-white/20 text-white rounded-xl"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="h-10 w-10 hover:bg-red-500/30 text-white rounded-xl"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Status Section */}
      <StatusSection />

      {/* Premium Search Bar */}
      <div className="p-3 bg-whatsapp-light border-b-2 border-whatsapp-border shrink-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-whatsapp-secondary" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-whatsapp-text px-12 py-3 rounded-xl outline-none text-sm placeholder-whatsapp-secondary border-2 border-whatsapp-border focus:border-whatsapp-green focus:ring-4 focus:ring-whatsapp-green/10 transition-all duration-300 shadow-sm"
          />
        </div>
      </div>

      {/* Chat List with Scroll Area */}
      <ScrollArea className="flex-1 bg-white">
        <div className="p-2">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="animate-spin h-10 w-10 border-4 border-whatsapp-green border-t-transparent rounded-full"></div>
                  <div className="absolute inset-0 animate-ping h-10 w-10 border-4 border-whatsapp-green/30 rounded-full"></div>
                </div>
                <p className="text-whatsapp-secondary text-sm font-medium">Loading chats...</p>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-whatsapp-secondary py-12 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-whatsapp-green/20 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-10 w-10 text-whatsapp-green" />
              </div>
              <p className="text-whatsapp-text font-bold mb-2">
                {searchQuery ? "No chats found" : "No conversations yet"}
              </p>
              <p className="text-sm mb-4">Start messaging your friends and family</p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowSearch(true)}
                  className="bg-gradient-to-r from-whatsapp-green to-green-600 hover:from-green-600 hover:to-whatsapp-green text-sm rounded-xl shadow-lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start a new chat
                </Button>
              )}
            </div>
          ) : (
            filteredConversations.map((chat, index) => {
              const sender = getSender(user, chat.users);
              const isOnline = sender?.id ? onlineUsers.has(sender.id) : false;
              const isSelected = selectedChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`
                    flex items-center p-3 cursor-pointer rounded-xl mb-1
                    transition-all duration-300 group animate-in fade-in slide-in-from-left
                    ${
                      isSelected
                        ? "bg-gradient-to-r from-whatsapp-green/15 to-green-50 border-2 border-whatsapp-green/30 shadow-lg"
                        : "hover:bg-whatsapp-light border-2 border-transparent hover:border-whatsapp-border"
                    }
                  `}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 mr-3">
                    <Avatar className={`h-14 w-14 ring-2 transition-all duration-300 ${
                      isSelected ? 'ring-whatsapp-green shadow-lg' : 'ring-whatsapp-border group-hover:ring-whatsapp-green/50'
                    }`}>
                      <AvatarImage
                        src={
                          chat.isGroupChat
                            ? chat.avatar || undefined
                            : sender?.avatar || undefined
                        }
                        alt={chat.isGroupChat ? chat.chatName || "Group" : sender?.name || "User"}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-whatsapp-green to-green-600 text-white font-bold text-lg">
                        {chat.isGroupChat
                          ? chat.chatName?.charAt(0).toUpperCase() || "G"
                          : sender?.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {!chat.isGroupChat && isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-3 border-white shadow-lg animate-pulse"></div>
                    )}
                    {chat.isGroupChat && (
                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-whatsapp-green to-green-600 rounded-full p-1.5 shadow-lg">
                        <Users className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 overflow-hidden min-w-0">
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <p className={`font-bold truncate text-sm ${
                        isSelected ? 'text-whatsapp-green' : 'text-whatsapp-text'
                      }`}>
                        {chat.isGroupChat ? chat.chatName : sender?.name || "Unknown"}
                      </p>
                      {chat.latestMessage && (
                        <span className="text-xs text-whatsapp-secondary flex-shrink-0 font-medium">
                          {formatTime(chat.latestMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-whatsapp-secondary text-xs truncate flex-1">
                        {chat.latestMessage ? (
                          <>
                            {chat.latestMessage.sender.name === user?.name && (
                              <span className="text-whatsapp-green font-semibold mr-1">You:</span>
                            )}
                            {chat.latestMessage.content || (
                              <span className="italic flex items-center gap-1">
                                📎 Media
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-whatsapp-secondary italic">Start a conversation</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Modals */}
      {showSearch && (
        <UserSearch
          onChatAccessed={handleStartChat}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          onGroupCreated={handleGroupCreated}
          onClose={() => setShowCreateGroup(false)}
        />
      )}

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Sidebar;