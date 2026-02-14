import { useState, useEffect } from "react";
import api, { chatAPI } from "../apis/api";
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
  Sparkles,
  Trash2,
  LogOut as LeaveIcon,
} from "lucide-react";
import SettingsModal from "./SettingsModal";
import StatusSection from "./StatusSection";

// Chat interface
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { onlineUsers, socket, isConnected } = useSocketContext();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Helper function to safely extract array from API response
  const extractChatsArray = (data: any): Chat[] => {
    if (Array.isArray(data)) {
      return data;
    }
    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    if (data?.chats && Array.isArray(data.chats)) {
      return data.chats;
    }
    console.warn("Unexpected API response format:", data);
    return [];
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Load initial unread counts when user/session changes
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        if (!user) return;
        const { data } = await api.get("/message/unread-counts");
        const next: Record<string, number> = {};
        const countsArray = Array.isArray(data) ? data : data?.data || [];
        countsArray.forEach((item: { chatId: string; count: number }) => {
          next[item.chatId] = item.count;
        });
        setUnreadCounts(next);
      } catch (error) {
        console.error("Failed to fetch unread counts:", error);
      }
    };

    fetchUnreadCounts();
  }, [user]);

  useEffect(() => {
    if (user?.id && conversations.length > 0) {
      setConversations((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((chat) => {
          const updatedUsers = chat.users.map((u) =>
            u.id === user.id
              ? { ...u, name: user.name, avatar: user.avatar }
              : u,
          );
          return { ...chat, users: updatedUsers };
        });
      });
    }
  }, [user?.id, user?.name, user?.avatar]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessageReceived: any) => {
      setConversations((prev) => {
        if (!Array.isArray(prev)) return [];

        const chatIndex = prev.findIndex(
          (c) => c.id === newMessageReceived.chatId,
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

      // Increase unread count only for messages from others, in chats that are not currently open
      setUnreadCounts((prev) => {
        const chatId = newMessageReceived.chatId;
        const senderId =
          newMessageReceived.sender?.id ?? newMessageReceived.senderId;

        if (
          !chatId ||
          selectedChatId === chatId ||
          !user?.id ||
          !senderId ||
          senderId === user.id
        ) {
          return prev;
        }

        return {
          ...prev,
          [chatId]: (prev[chatId] || 0) + 1,
        };
      });
    };

    const handleGroupCreated = (data: any) => {
      if (!user?.id) return;
      const participants: string[] =
        data?.participants ??
        data?.group?.users?.map((u: { id: string }) => u.id) ??
        [];
      if (participants.includes(user.id)) {
        fetchConversations();
      }
    };

    const handleGroupUserAdded = (data: any) => {
      if (!user?.id) return;
      // If current user was added to group, refresh conversations
      if (data?.userId === user.id) {
        fetchConversations();
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("group:created", handleGroupCreated);
    socket.on("group:user-added", handleGroupUserAdded);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("group:created", handleGroupCreated);
      socket.off("group:user-added", handleGroupUserAdded);
    };
  }, [socket, user?.id, selectedChatId]);

  const fetchConversations = async () => {
    try {
      if (!user) return;
      setLoading(true);
      const { data } = await api.get("/chat/fetch-chat");
      const chatsArray = extractChatsArray(data);
      setConversations(chatsArray);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      setConversations([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChatId(chat.id);
    onSelectChat(chat);

    // Clear unread count for this chat when opened
    setUnreadCounts((prev) => {
      if (!prev[chat.id]) return prev;
      const next = { ...prev };
      next[chat.id] = 0;
      return next;
    });
  };

  const handleDeleteChat = async (chat: Chat) => {
    try {
      await chatAPI.deleteChat(chat.id);
      setConversations((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter((c) => c.id !== chat.id);
      });
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleLeaveGroup = async (chat: Chat) => {
    try {
      await chatAPI.leaveGroup(chat.id);
      setConversations((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter((c) => c.id !== chat.id);
      });
    } catch (error) {
      console.error("Failed to leave group:", error);
    }
  };

  const handleStartChat = (newChat: Chat) => {
    setConversations((prev) => {
      if (!Array.isArray(prev)) return [newChat];
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
    setConversations((prev) => {
      if (!Array.isArray(prev)) return [newGroup];
      return [newGroup, ...prev];
    });
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

  // Safely filter conversations
  const filteredConversations = Array.isArray(conversations)
    ? conversations.filter((chat) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const sender = getSender(user, chat.users);
        const chatName = chat.isGroupChat
          ? chat.chatName?.toLowerCase() || ""
          : sender?.name?.toLowerCase() || "";
        return chatName.includes(query);
      })
    : [];

  return (
    <div className="w-full h-full bg-white flex flex-col border-r border-gray-200">
      {/* Header */}
      <div className="p-4 bg-slate-800 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-12 w-12 ring-2 ring-slate-600 shadow-sm">
            <AvatarImage
              src={
                user?.avatar
                  ? `${user.avatar}${user.avatar.includes("?") ? "&" : "?"}t=${Date.now()}`
                  : undefined
              }
              alt={user?.name}
              key={user?.avatar}
            />
            <AvatarFallback className="bg-slate-600 text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm block truncate">
                {user?.name}
              </span>
              <div className="flex items-center gap-1.5 bg-slate-700 px-2 py-0.5 rounded-full">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                  }`}
                />
                <span className="text-xs text-slate-300 font-medium">
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
            className="h-10 w-10 hover:bg-slate-700 text-white rounded-lg"
            title="New Chat"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCreateGroup(true)}
            className="h-10 w-10 hover:bg-slate-700 text-white rounded-lg"
            title="New Group"
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="h-10 w-10 hover:bg-slate-700 text-white rounded-lg"
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
            className="h-10 w-10 hover:bg-red-600 text-white rounded-lg"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Status Section */}
      <StatusSection />

      {/* Search Bar */}
      <div className="p-3 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-gray-800 px-12 py-2.5 rounded-lg outline-none text-sm placeholder-gray-400 border border-gray-200 focus:border-slate-400 transition-all duration-200"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 bg-white">
        <div className="py-1">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-3 border-slate-600 border-t-transparent rounded-full"></div>
                <p className="text-gray-500 text-sm">Loading chats...</p>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-gray-500 py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-gray-800 font-semibold mb-1">
                {searchQuery ? "No chats found" : "No conversations yet"}
              </p>
              <p className="text-sm mb-4">Start messaging your friends</p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowSearch(true)}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-sm rounded-lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start a new chat
                </Button>
              )}
            </div>
          ) : (
            filteredConversations.map((chat) => {
              const sender = getSender(user, chat.users);
              const isOnline = sender?.id ? onlineUsers.has(sender.id) : false;
              const isSelected = selectedChatId === chat.id;
              const unread = unreadCounts[chat.id] || 0;

              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`
                    flex items-center px-3 py-3 cursor-pointer
                    transition-colors duration-150
                    ${isSelected ? "bg-slate-100" : "hover:bg-gray-50"}
                  `}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 mr-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={
                          chat.isGroupChat
                            ? chat.avatar || undefined
                            : sender?.avatar || undefined
                        }
                        alt={
                          chat.isGroupChat
                            ? chat.chatName || "Group"
                            : sender?.name || "User"
                        }
                      />
                      <AvatarFallback className="bg-slate-600 text-white font-semibold">
                        {chat.isGroupChat
                          ? chat.chatName?.charAt(0).toUpperCase() || "G"
                          : sender?.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {!chat.isGroupChat && isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                    )}
                    {chat.isGroupChat && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-slate-600 rounded-full p-1">
                        <Users className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 overflow-hidden min-w-0 border-b border-gray-100 py-1">
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-medium truncate text-gray-800">
                        {chat.isGroupChat
                          ? chat.chatName
                          : sender?.name || "Unknown"}
                      </p>
                      {chat.latestMessage && (
                        <span className="text-xs text-gray-500 shrink-0">
                          {formatTime(chat.latestMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-gray-600 text-sm truncate">
                        {chat.latestMessage ? (
                          <>
                            {chat.latestMessage.sender.name === user?.name && (
                              <span className="text-gray-500">You: </span>
                            )}
                            {chat.latestMessage.content || "📎 Media"}
                          </>
                        ) : (
                          <span className="italic">Start a conversation</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {unread > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (chat.isGroupChat) {
                              handleLeaveGroup(chat);
                            } else {
                              handleDeleteChat(chat);
                            }
                          }}
                          className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                          title={
                            chat.isGroupChat ? "Leave group" : "Delete chat"
                          }
                        >
                          {chat.isGroupChat ? (
                            <LeaveIcon className="h-3.5 w-3.5" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
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

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default Sidebar;
