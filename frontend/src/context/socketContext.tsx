import { createContext, useEffect, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../configs/env";

interface SocketContextProps {
  socket: Socket | null;
  onlineUsers: Set<string>;
  isConnected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendMessage: (
    data: {
      content: string;
      chatId: string;
      type?: string;
      replyToId?: string;
    },
    callback: (response: any) => void,
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
    const newSocket = io(API_BASE_URL, {
      withCredentials: true,
    });

    setSocket(newSocket);

    // Connection established
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);

      // user.id exists before emitting
      if (user && user.id) {
        console.log("📤 Emitting user:connect with userId:", user.id);
        newSocket.emit("user:connect", user.id);
      } else {
        console.error("❌ user.id is undefined!");
      }

      // Ask for browser notification permission once on successful connection
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission().catch(() => {
            // ignore errors
          });
        }
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

    // Global listener to show browser notifications when app is in background
    newSocket.on("message:new", (payload: any) => {
      try {
        // Early returns for invalid conditions
        if (typeof window === "undefined" || !("Notification" in window)) {
          return;
        }
    
        // Check if notification permission granted
        if (Notification.permission !== "granted") {
          return;
        }
    
        // Get sender ID from various possible locations
        const senderIdFromPayload =
          payload?.senderId ?? payload?.sender?.id ?? null;
        
        // ✅ FIX 1: Don't notify if it's your own message
        const isFromSelf =
          !!senderIdFromPayload && 
          !!user?.id && 
          senderIdFromPayload === user.id;
        
        if (isFromSelf) {
          console.log("🔇 Skipping notification - own message");
          return;
        }
    
        // ✅ FIX 2: Only notify if tab is hidden/minimized/background
        const isHidden =
          typeof document !== "undefined" &&
          document.visibilityState === "hidden";
    
        if (!isHidden) {
          console.log("🔇 Skipping notification - tab is visible");
          return;
        }
    
        // ✅ All checks passed - show notification
        const title =
          payload?.sender?.name ?? 
          payload?.chatName ?? 
          "New message on Chit-Chat";
        
        const body =
          payload?.content && typeof payload.content === "string"
            ? payload.content
            : "You have a new message";
    
        console.log("🔔 Showing notification:", { title, body });
        
        new Notification(title, { body });
      } catch (error) {
        console.error("❌ Notification error:", error);
      }
    });

    // Browser notifications for important group events
    const showGroupNotification = (title: string, body: string) => {
      try {
        if (
          typeof window === "undefined" ||
          !("Notification" in window) ||
          Notification.permission !== "granted"
        ) {
          return;
        }

        const isHidden =
          typeof document !== "undefined" &&
          document.visibilityState === "hidden";
        if (!isHidden) return;

        new Notification(title, { body });
      } catch {
        // ignore
      }
    };

    newSocket.on("group:created", (data: any) => {
      if (!user?.id) return;
      const participants: string[] =
        data?.participants ??
        data?.group?.users?.map((u: { id: string }) => u.id) ??
        [];
      if (!participants.includes(user.id)) return;

      const groupName =
        data?.group?.chatName ?? data?.group?.name ?? "New group";
      const createdBy =
        data?.group?.creatorName ?? data?.createdByName ?? "Someone";

      showGroupNotification(
        `You were added to ${groupName}`,
        `${createdBy} created a group with you`
      );
    });

    newSocket.on("group:user-added", (data: any) => {
      if (!user?.id) return;
      if (data?.userId !== user.id) return;

      const groupName =
        data?.group?.chatName ?? data?.group?.name ?? "a group";
      showGroupNotification(
        `Added to ${groupName}`,
        `You have been added to ${groupName}`
      );
    });

    // Cleanup on unmount or user change
    return () => {
      console.log("🧹 Cleaning up socket");
      newSocket.disconnect();
    };
  }, [user?.id]);

  // Helper functions
  const joinChat = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("chat:join", chatId);
        console.log("📥 Joined chat:", chatId);
      }
    },
    [socket, isConnected],
  );

  const leaveChat = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("chat:leave", chatId);
        console.log("📤 Left chat:", chatId);
      }
    },
    [socket, isConnected],
  );

  const sendMessage = useCallback(
    (
      data: {
        content: string;
        chatId: string;
        type?: string;
        replyToId?: string;
      },
      callback: (response: any) => void,
    ) => {
      if (socket && isConnected) {
        socket.emit("message:send", data, callback);
      } else {
        callback({ success: false, error: "Not connected" });
      }
    },
    [socket, isConnected],
  );

  const startTyping = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("typing:start", chatId);
      }
    },
    [socket, isConnected],
  );

  const stopTyping = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("typing:stop", chatId);
      }
    },
    [socket, isConnected],
  );

  const markAsDelivered = useCallback(
    (messageId: string) => {
      if (socket && isConnected) {
        socket.emit("message:delivered", messageId);
      }
    },
    [socket, isConnected],
  );

  const markAsRead = useCallback(
    (messageId: string, chatId: string) => {
      if (socket && isConnected) {
        socket.emit("message:read", { messageId, chatId });
      }
    },
    [socket, isConnected],
  );

  const deleteMessage = useCallback(
    (messageId: string, chatId: string) => {
      if (socket && isConnected) {
        socket.emit("message:delete", { messageId, chatId });
      }
    },
    [socket, isConnected],
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
