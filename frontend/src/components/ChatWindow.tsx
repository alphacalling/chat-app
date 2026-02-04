import { useEffect, useState, useRef } from "react";
import api from "../apis/api";
import MessageInput from "./MessageInput";
import MessageBubble from "./Messagebubble";
import { useSocketContext } from "../context/useSocket";
import { useAuth } from "../context/useAuth";

interface Message {
  id: string;
  content: string;
  type: string;
  status: string;
  senderId: string;
  chatId: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Chat {
  id: string;
  name: string;
  participantId: string;
}

interface ChatWindowProps {
  selectedChat: Chat | null;
}

const ChatWindow = ({ selectedChat }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  const { 
    socket, 
    onlineUsers, 
    isConnected,
    joinChat, 
    leaveChat, 
    sendMessage: socketSendMessage,
    startTyping,
    stopTyping,
    markAsDelivered,
    markAsRead 
  } = useSocketContext();
  
  const { user } = useAuth();
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const prevChatIdRef = useRef<string | null>(null);

  // Join/Leave chat rooms
  useEffect(() => {
    if (!selectedChat || !isConnected) return;

    // Leave previous chat
    if (prevChatIdRef.current && prevChatIdRef.current !== selectedChat.id) {
      leaveChat(prevChatIdRef.current);
    }

    // Join new chat
    joinChat(selectedChat.id);
    prevChatIdRef.current = selectedChat.id;

    // Cleanup: leave chat when component unmounts or chat changes
    return () => {
      if (selectedChat.id) {
        leaveChat(selectedChat.id);
      }
    };
  }, [selectedChat?.id, isConnected, joinChat, leaveChat]);

  // Fetch initial messages
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      setLoading(true);
      setMessages([]);
      
      try {
        const { data } = await api.get(`/api/messages/${selectedChat.id}`);
        setMessages(data);
        
        // Mark unread messages as read
        data.forEach((msg: Message) => {
          if (msg.senderId !== user?.id && msg.status !== "READ") {
            markAsRead(msg.id, selectedChat.id);
          }
        });
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedChat?.id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !selectedChat) return;

    // New message received
    const handleNewMessage = (message: Message) => {
      if (message.chatId === selectedChat.id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Mark as delivered if not from me
        if (message.senderId !== user?.id) {
          markAsDelivered(message.id);
          // Mark as read since chat is open
          markAsRead(message.id, selectedChat.id);
        }
      }
    };

    // Message delivered
    const handleDelivered = ({ messageId, deliveredAt }: { messageId: string; deliveredAt: Date }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "DELIVERED", deliveredAt } : msg
        )
      );
    };

    // Message read
    const handleRead = ({ messageId, readAt }: { messageId: string; readAt: Date }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "READ", readAt } : msg
        )
      );
    };

    // Typing indicators
    const handleTypingStart = ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (chatId === selectedChat.id && userId !== user?.id) {
        setTypingUsers((prev) => new Set(prev).add(userId));
      }
    };

    const handleTypingStop = ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (chatId === selectedChat.id) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:delivered", handleDelivered);
    socket.on("message:read", handleRead);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:delivered", handleDelivered);
      socket.off("message:read", handleRead);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, selectedChat, user?.id, markAsDelivered, markAsRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers.size]);

  // Send message handler
  const handleSendMessage = (content: string) => {
    if (!selectedChat || !content.trim()) return;

    socketSendMessage(
      { 
        content, 
        chatId: selectedChat.id,
        type: "TEXT"
      },
      (response) => {
        if (response.success && response.message) {
          // Message will be added via socket event
          console.log("✅ Message sent:", response.message.id);
        } else {
          console.error("❌ Failed to send:", response.error);
          // You could show a toast notification here
        }
      }
    );

    // Stop typing indicator
    stopTyping(selectedChat.id);
  };

  // Typing handler
  const handleTyping = () => {
    if (selectedChat) {
      startTyping(selectedChat.id);
    }
  };

  const handleStopTyping = () => {
    if (selectedChat) {
      stopTyping(selectedChat.id);
    }
  };

  // No chat selected state
  if (!selectedChat) {
    return (
      <div className="w-2/3 bg-whatsapp-dark flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-light mb-2">WhatsApp Clone</h2>
          <p className="text-gray-400">Select a chat to start messaging</p>
          {!isConnected && (
            <p className="text-yellow-500 mt-2 text-sm">⚠️ Connecting to server...</p>
          )}
        </div>
      </div>
    );
  }

  const isOnline = onlineUsers.has(selectedChat.participantId);
  const isTyping = typingUsers.size > 0;

  return (
    <div className="w-2/3 flex flex-col bg-whatsapp-dark">
      {/* Header */}
      <div className="p-4 bg-whatsapp-panel border-b border-gray-700 flex items-center">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white font-semibold">
            {selectedChat.name?.charAt(0).toUpperCase()}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-whatsapp-panel"></div>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h2 className="font-bold text-white">{selectedChat.name}</h2>
          <p className="text-xs text-gray-400">
            {isTyping ? (
              <span className="text-whatsapp-green">typing...</span>
            ) : isOnline ? (
              <span className="text-green-400">online</span>
            ) : (
              "offline"
            )}
          </p>
        </div>
        
        {/* Connection status indicator */}
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
             title={isConnected ? 'Connected' : 'Disconnected'} />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b141a]">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-gray-400">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Say hello! 👋</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-incoming-bg px-4 py-3 rounded-lg rounded-tl-none">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={lastMessageRef} />
      </div>

      {/* Message Input */}
      <MessageInput 
        sendMessage={handleSendMessage} 
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        disabled={!isConnected}
      />
    </div>
  );
};

export default ChatWindow;