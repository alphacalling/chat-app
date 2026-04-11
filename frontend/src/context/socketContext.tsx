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
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers(new Set());
      }
      return;
    }

    const socketUrl = API_BASE_URL || window.location.origin;

    const newSocket = io(socketUrl, {
      withCredentials: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      if (user && user.id) {
        newSocket.emit("user:connect", user.id);
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

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", () => {
      setIsConnected(false);
    });

    newSocket.on("user:online-list", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on("user:online", (userId: string) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    newSocket.on("user:offline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    newSocket.on("error", () => {
      // server-side socket error — silent
    });

    // Global listener: auto-deliver + browser notifications
    newSocket.on("message:new", (payload: any) => {
      try {
        const senderIdFromPayload =
          payload?.senderId ?? payload?.sender?.id ?? null;

        const isFromSelf =
          !!senderIdFromPayload &&
          !!user?.id &&
          senderIdFromPayload === user.id;

        // Auto-mark incoming messages as delivered (regardless of which chat is open)
        if (!isFromSelf && payload?.id) {
          newSocket.emit("message:delivered", payload.id);
        }

        // Browser notification when tab is hidden
        if (
          typeof window === "undefined" ||
          !("Notification" in window) ||
          Notification.permission !== "granted"
        ) {
          return;
        }

        if (isFromSelf) return;

        const isHidden =
          typeof document !== "undefined" &&
          document.visibilityState === "hidden";

        if (!isHidden) return;

        const title =
          payload?.sender?.name ??
          payload?.chatName ??
          "New message on Chit-Chat";

        const body =
          payload?.content && typeof payload.content === "string"
            ? payload.content
            : "You have a new message";

        new Notification(title, { body });
      } catch {
        // notification error — silent
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

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]);

  // Helper functions
  const joinChat = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("chat:join", chatId);
      }
    },
    [socket, isConnected],
  );

  const leaveChat = useCallback(
    (chatId: string) => {
      if (socket && isConnected) {
        socket.emit("chat:leave", chatId);
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
