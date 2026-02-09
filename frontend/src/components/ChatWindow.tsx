import { useEffect, useState, useRef } from "react";
import {
  Info,
  Phone,
  Video,
  MoreVertical,
  Pin,
  X,
  MessageCircle,
} from "lucide-react";
import MessageInput from "./MessageInput";
import MessageBubble from "./Messagebubble";
import GroupInfoModal from "./GroupInfoModal";
import UserProfileModal from "./UserProfileModal";
import { useSocketContext } from "../context/useSocket";
import { useAuth } from "../context/useAuth";
import { messageAPI } from "../apis/api";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { getSender } from "../utils/chatUtils";

interface Message {
  id: string;
  content: string | null;
  status: string;
  senderId: string;
  chatId?: string;
  createdAt: string;
  type?: string;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  isEdited?: boolean;
  editedAt?: string;
  replyTo?: any;
  reactions?: any[];
  sender: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

interface ChatUser {
  id: string;
  name: string;
  isOnline?: boolean;
  avatar?: string | null;
}

interface Chat {
  id: string;
  chatName: string | null;
  isGroupChat: boolean;
  avatar?: string | null;
  users: ChatUser[];
  latestMessage?: any;
}

interface ChatWindowProps {
  selectedChat: Chat | null;
  onChatUpdate?: (updatedChat: Chat) => void;
}

const ChatWindow = ({ selectedChat, onChatUpdate }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const { socket, isConnected, onlineUsers } = useSocketContext();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data } = await messageAPI.getMessages(selectedChat.id);
        setMessages(data.data || []);

        try {
          const pinnedData = await messageAPI.getPinnedMessage(selectedChat.id);
          if (pinnedData.data) {
            setPinnedMessage(pinnedData.data);
          }
        } catch (error) {
          // No pinned message
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    if (socket && isConnected) {
      socket.emit("chat:join", selectedChat.id);
    }

    return () => {
      if (socket && selectedChat.id) {
        socket.emit("chat:leave", selectedChat.id);
      }
    };
  }, [selectedChat, socket, isConnected]);

  useEffect(() => {
    if (!selectedChat) return;
    const otherUser = selectedChat.users.find((u) => u.id !== user?.id);
    if (otherUser) {
      setOtherUserOnline(onlineUsers.has(otherUser.id));
    }
  }, [onlineUsers, selectedChat, user?.id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage: Message) => {
      if (selectedChat && newMessage.chatId === selectedChat.id) {
        setMessages((prev) => {
          const exists = prev.find((msg) => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });

        if (newMessage.senderId !== user?.id) {
          socket.emit("message:delivered", newMessage.id);
          setTimeout(() => {
            socket.emit("message:read", {
              messageId: newMessage.id,
              chatId: selectedChat.id,
            });
          }, 1000);
        }
      }
    };

    const handleMessageDelivered = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "DELIVERED" } : msg,
        ),
      );
    };

    const handleMessageRead = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "READ" } : msg,
        ),
      );
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: "This message was deleted", status: "DELETED" }
            : msg,
        ),
      );
    };

    const handleMessageEdited = ({ id, content, isEdited, editedAt }: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, content, isEdited, editedAt } : msg,
        ),
      );
    };

    const handleMessageReaction = ({ messageId, reactions }: any) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reactions } : msg)),
      );
    };

    const handleMessagePinned = ({ messageId, pinnedAt }: any) => {
      setMessages((prev) => {
        const updated = prev.map((msg) => ({
          ...msg,
          pinnedAt: msg.id === messageId ? pinnedAt : null,
        }));
        const pinned = updated.find((msg) => msg.id === messageId);
        if (pinned) setPinnedMessage(pinned);
        return updated;
      });
    };

    const handleMessageUnpinned = ({ messageId }: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, pinnedAt: null } : msg,
        ),
      );
      setPinnedMessage(null);
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:delivered", handleMessageDelivered);
    socket.on("message:read", handleMessageRead);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:edited", handleMessageEdited);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("message:pinned", handleMessagePinned);
    socket.on("message:unpinned", handleMessageUnpinned);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:delivered", handleMessageDelivered);
      socket.off("message:read", handleMessageRead);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:edited", handleMessageEdited);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("message:pinned", handleMessagePinned);
      socket.off("message:unpinned", handleMessageUnpinned);
    };
  }, [socket, selectedChat, user?.id]);

  const handleSendMessage = async (content: string) => {
    if (!selectedChat || !content.trim()) return;

    try {
      const replyToId = replyingTo?.id;
      const { data } = await messageAPI.sendMessageWithReply(
        selectedChat.id,
        content.trim(),
        replyToId,
      );
      const newMessage = data.data;
      setMessages((prev) => {
        const exists = prev.find((msg) => msg.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleEdit = (message: Message) => {
    // Edit is handled in MessageBubble component
  };

  const handleSendMedia = async (file: File) => {
    if (!selectedChat || !file) return;

    try {
      const { data } = await messageAPI.sendMedia(selectedChat.id, file);
      const newMessage = data.data;
      setMessages((prev) => {
        const exists = prev.find((msg) => msg.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
    } catch (error: any) {
      console.error("Failed to send media:", error);
      alert(
        `Failed to send file: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: "This message was deleted", status: "DELETED" }
            : msg,
        ),
      );
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const sender = selectedChat ? getSender(user, selectedChat.users) : null;

  useEffect(() => {
    if (selectedChat && user && selectedChat.users) {
      const userIndex = selectedChat.users.findIndex((u) => u.id === user.id);
      if (
        userIndex !== -1 &&
        selectedChat.users[userIndex].avatar !== user.avatar
      ) {
        const updatedUsers = [...selectedChat.users];
        updatedUsers[userIndex] = {
          ...updatedUsers[userIndex],
          avatar: user.avatar,
        };
        if (onChatUpdate) {
          onChatUpdate({
            ...selectedChat,
            users: updatedUsers,
          });
        }
      }
    }
  }, [user?.avatar, selectedChat?.id]);

  if (!selectedChat) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-whatsapp-light via-white to-gray-50 flex items-center justify-center">
        <div className="text-center animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-whatsapp-green to-green-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-whatsapp-green/30">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-lg">💬</span>
            </div>
          </div>
          <p className="text-whatsapp-text text-xl font-bold mb-2">
            Select a chat to start messaging
          </p>
          <p className="text-whatsapp-secondary text-sm">
            Your conversations will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-whatsapp-light via-white to-gray-50">
      {/* Premium Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b-2 border-whatsapp-border p-4 flex items-center justify-between flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-12 w-12 ring-4 ring-whatsapp-green/20 shadow-lg transition-all duration-300 hover:ring-whatsapp-green/40">
            <AvatarImage
              src={
                selectedChat.isGroupChat
                  ? selectedChat.avatar
                    ? `${selectedChat.avatar}${selectedChat.avatar.includes("?") ? "&" : "?"}t=${Date.now()}`
                    : undefined
                  : sender?.avatar
                    ? `${sender.avatar}${sender.avatar.includes("?") ? "&" : "?"}t=${Date.now()}`
                    : undefined
              }
              alt={
                selectedChat.isGroupChat
                  ? selectedChat.chatName || "Group"
                  : sender?.name || "User"
              }
              key={selectedChat.avatar || sender?.avatar}
            />
            <AvatarFallback className="bg-gradient-to-br from-whatsapp-green to-green-600 text-white font-bold text-lg">
              {selectedChat.isGroupChat
                ? selectedChat.chatName?.charAt(0).toUpperCase() || "G"
                : sender?.name?.charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-whatsapp-text font-bold text-base flex items-center gap-2 truncate">
              {selectedChat.isGroupChat
                ? selectedChat.chatName
                : sender?.name || "Unknown"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {!selectedChat.isGroupChat && (
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    otherUserOnline
                      ? "bg-green-500 shadow-lg shadow-green-500/50 animate-pulse"
                      : "bg-gray-400"
                  }`}
                />
              )}
              <p className="text-xs text-whatsapp-secondary font-medium truncate">
                {selectedChat.isGroupChat
                  ? `${selectedChat.users.length} members`
                  : otherUserOnline
                    ? "Online"
                    : "Offline"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!selectedChat.isGroupChat && sender && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-whatsapp-light transition-all duration-300 rounded-xl"
              >
                <Phone className="h-5 w-5 text-whatsapp-secondary hover:text-whatsapp-green transition-colors" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-whatsapp-light transition-all duration-300 rounded-xl"
              >
                <Video className="h-5 w-5 text-whatsapp-secondary hover:text-whatsapp-green transition-colors" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-whatsapp-light transition-all duration-300 rounded-xl"
                onClick={() => setShowUserProfile(true)}
              >
                <Info className="h-5 w-5 text-whatsapp-secondary hover:text-whatsapp-green transition-colors" />
              </Button>
            </>
          )}
          {selectedChat.isGroupChat && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGroupInfo(true)}
              className="h-10 w-10 hover:bg-whatsapp-light transition-all duration-300 rounded-xl"
            >
              <Info className="h-5 w-5 text-whatsapp-secondary hover:text-whatsapp-green transition-colors" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-whatsapp-light transition-all duration-300 rounded-xl"
          >
            <MoreVertical className="h-5 w-5 text-whatsapp-secondary hover:text-whatsapp-green transition-colors" />
          </Button>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b-2 border-yellow-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
              <Pin className="h-5 w-5 text-yellow-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-yellow-700 font-semibold mb-0.5">
                Pinned Message
              </p>
              <p className="text-sm text-whatsapp-text font-medium truncate">
                {pinnedMessage.content || "Media"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const element = document.getElementById(
                `message-${pinnedMessage.id}`,
              );
              element?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="text-whatsapp-green hover:text-green-700 text-sm font-bold px-4 py-2 hover:bg-yellow-200 rounded-lg transition-all duration-300"
          >
            Jump
          </button>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjBmMGYwIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] bg-whatsapp-light/30">
        <div className="p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center items-center h-full py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="animate-spin h-12 w-12 border-4 border-whatsapp-green border-t-transparent rounded-full"></div>
                  <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-whatsapp-green/30 rounded-full"></div>
                </div>
                <p className="text-whatsapp-secondary text-sm font-medium">
                  Loading messages...
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full py-12">
              <div className="text-center animate-in fade-in zoom-in duration-500">
                <div className="text-6xl mb-4">👋</div>
                <p className="text-whatsapp-text font-bold text-lg mb-1">
                  No messages yet
                </p>
                <p className="text-whatsapp-secondary text-sm">
                  Say hello to start the conversation!
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <MessageBubble
                  message={message}
                  isOwn={message.senderId === user?.id}
                  isGroup={selectedChat.isGroupChat}
                  chatId={selectedChat.id}
                  onDelete={() => handleDeleteMessage(message.id)}
                  onReply={handleReply}
                  onEdit={handleEdit}
                />
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="border-t-2 border-whatsapp-border bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-gradient-to-b from-whatsapp-green to-green-600 rounded-full"></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-whatsapp-green font-bold mb-1">
                Replying to {replyingTo.sender.name}
              </p>
              <p className="text-sm text-whatsapp-text font-medium truncate">
                {replyingTo.content || "Media"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-whatsapp-secondary hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all duration-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t-2 border-whatsapp-border bg-white/95 backdrop-blur-xl p-4 flex-shrink-0 shadow-2xl">
        <MessageInput
          onSendMessage={handleSendMessage}
          onSendMedia={handleSendMedia}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {/* Group Info Modal */}
      {showGroupInfo && selectedChat.isGroupChat && (
        <GroupInfoModal
          chat={{
            ...selectedChat,
            users: selectedChat.users.map((u) => ({
              id: u.id,
              name: u.name,
              phone: "",
              avatar: u.avatar || undefined,
              isOnline: u.isOnline,
            })),
          }}
          onClose={() => setShowGroupInfo(false)}
          onGroupUpdated={(updatedChat) => {
            if (onChatUpdate) {
              const updated: Chat = {
                id: updatedChat.id,
                chatName: updatedChat.chatName || updatedChat.name,
                isGroupChat: updatedChat.isGroupChat || updatedChat.isGroup,
                avatar: updatedChat.avatar,
                users: updatedChat.users || [],
                latestMessage: updatedChat.latestMessage,
                updatedAt: updatedChat.updatedAt || new Date().toISOString(),
              };
              onChatUpdate(updated);
            }
            setShowGroupInfo(false);
          }}
        />
      )}

      {/* User Profile Modal */}
      {!selectedChat.isGroupChat && sender && (
        <UserProfileModal
          open={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          userId={sender.id}
          userName={sender.name}
          userAvatar={sender.avatar || undefined}
        />
      )}
    </div>
  );
};

export default ChatWindow;
