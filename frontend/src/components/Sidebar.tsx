import { useState, useEffect } from "react";
import api from "../apis/api";
import { useSocketContext } from "../context/useSocket";
import { useAuth } from "../context/useAuth";
import UserSearch from "./UserSearch";
import { useNavigate } from "react-router-dom";
import { getSender } from "../utils/chatUtils";

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
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { onlineUsers, socket, isConnected } = useSocketContext();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessageReceived: any) => {
      setConversations((prev) => {
        const chatIndex = prev.findIndex(
          (c) => c.id === newMessageReceived.chatId
        );

        if (chatIndex !== -1) {
          // Chat exists - update and move to top
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

          // Remove from current position and add to top
          updatedChats.splice(chatIndex, 1);
          return [updatedChat, ...updatedChats];
        } else {
          // New chat - fetch all conversations
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
      const { data } = await api.get("/chat/fetch-chat");
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
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="w-1/3 border-r border-gray-700 bg-whatsapp-dark flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-whatsapp-panel flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold overflow-hidden">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <span className="text-white font-semibold block">{user?.name}</span>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowSearch(true)}
            className="text-gray-400 hover:text-white text-xl transition-colors"
            title="New Chat"
          >
            ✏️
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="text-gray-400 hover:text-red-500 text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-whatsapp-dark shrink-0">
        <input
          type="text"
          placeholder="Filter chats..."
          className="w-full bg-whatsapp-panel text-white px-4 py-2 rounded-lg outline-none text-sm placeholder-gray-400"
        />
      </div>

      {/* Chat List */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-gray-400">Loading chats...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No conversations yet</p>
            <button
              onClick={() => setShowSearch(true)}
              className="text-whatsapp-green mt-2 hover:underline"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          conversations.map((chat) => {
            const sender = getSender(user, chat.users);
            const isOnline = sender?.id ? onlineUsers.has(sender.id) : false;

            return (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                className={`flex items-center p-3 cursor-pointer hover:bg-whatsapp-panel 
                  text-white border-b border-gray-800 transition-colors
                  ${selectedChatId === chat.id ? "bg-whatsapp-panel" : ""}`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-500 flex items-center justify-center text-lg font-semibold overflow-hidden">
                    {sender?.avatar ? (
                      <img
                        src={sender.avatar}
                        alt="pic"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      sender?.name?.charAt(0).toUpperCase() || "?"
                    )}
                  </div>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-whatsapp-dark"></div>
                  )}
                </div>

                {/* Chat Info */}
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold truncate">
                      {sender?.name || "Unknown"}
                    </p>
                    {chat.latestMessage && (
                      <span className="text-xs text-gray-400">
                        {formatTime(chat.latestMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-gray-400 text-sm truncate w-4/5">
                      {chat.latestMessage ? (
                        <>
                          {chat.latestMessage.sender.name === user?.name && (
                            <span className="text-gray-500">You: </span>
                          )}
                          {chat.latestMessage.content || "Media"}
                        </>
                      ) : (
                        "Start a conversation"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Search Modal */}
      {showSearch && (
        <UserSearch
          onChatAccessed={handleStartChat}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
};

export default Sidebar;