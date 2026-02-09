// client/src/context/socketContext.tsx
import { createContext, useEffect, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

interface SocketContextProps {
  socket: Socket | null;
  onlineUsers: Set<string>;
  isConnected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendMessage: (
    data: { content: string; chatId: string; type?: string; replyToId?: string },
    callback: (response: any) => void
  ) => void;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  markAsDelivered: (messageId: string) => void;
  markAsRead: (messageId: string, chatId: string) => void;
  deleteMessage: (messageId: string, chatId: string) => void;
}

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketContext = createContext<SocketContextProps | null>(null);

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only connect if user exists and has an id
    if (!user || !user.id) {
      console.log("❌ No user or user.id, skipping socket connection");

      // Cleanup existing socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers(new Set());
      }
      return;
    }

    console.log("🔌 Connecting socket for user:", user.id);

    // Access token is in httpOnly cookie; send credentials so backend can verify
    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
    });

    setSocket(newSocket);

    // Connection established
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);

      // ✅ FIX: Make sure user.id exists before emitting
      if (user && user.id) {
        console.log("📤 Emitting user:connect with userId:", user.id);
        newSocket.emit("user:connect", user.id);
      } else {
        console.error("❌ user.id is undefined!");
      }
    });

    // Connection lost
    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    // Connection error
    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setIsConnected(false);
    });

    // User came online
    newSocket.on("user:online", (userId: string) => {
      console.log("👤 User online:", userId);
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    // User went offline
    newSocket.on("user:offline", ({ userId }) => {
      console.log("👤 User offline:", userId);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Error from server
    newSocket.on("error", ({ message }) => {
      console.error("⚠️ Socket error:", message);
    });

    // Cleanup on unmount or user change
    return () => {
      console.log("🧹 Cleaning up socket");
      newSocket.disconnect();
    };
  }, [user?.id]); // ✅ Only depend on user.id, not entire user object

  // Helper functions
  const joinChat = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("chat:join", chatId);
        console.log("📥 Joined chat:", chatId);
      }
    },
    [socket, isConnected]
  );

  const leaveChat = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("chat:leave", chatId);
        console.log("📤 Left chat:", chatId);
      }
    },
    [socket, isConnected]
  );

  const sendMessage = useCallback(
    (
      data: { content: string; chatId: string; type?: string; replyToId?: string },
      callback: (response: any) => void
    ) => {
      if (socket && isConnected) {
        socket.emit("message:send", data, callback);
      } else {
        callback({ success: false, error: "Not connected" });
      }
    },
    [socket, isConnected]
  );

  const startTyping = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("typing:start", chatId);
      }
    },
    [socket, isConnected]
  );

  const stopTyping = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("typing:stop", chatId);
      }
    },
    [socket, isConnected]
  );

  const markAsDelivered = useCallback(
    (messageId: string) => {
      if (socket && isConnected) {
        socket.emit("message:delivered", messageId);
      }
    },
    [socket, isConnected]
  );

  const markAsRead = useCallback(
    (messageId: string, chatId: string) => {
      if (socket && isConnected) {
        socket.emit("message:read", { messageId, chatId });
      }
    },
    [socket, isConnected]
  );

  const deleteMessage = useCallback(
    (messageId: string, chatId: string) => {
      if (socket && isConnected) {
        socket.emit("message:delete", { messageId, chatId });
      }
    },
    [socket, isConnected]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        isConnected,
        joinChat,
        leaveChat,
        sendMessage,
        startTyping,
        stopTyping,
        markAsDelivered,
        markAsRead,
        deleteMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};