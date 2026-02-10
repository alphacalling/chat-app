import axios from "axios";
import { API_BASE_URL } from "../configs/env";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthCheck = originalRequest?.url?.includes?.("/me/profile");
    if (isAuthCheck) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token is in httpOnly cookie
        await api.post("/auth/refresh");
        // New access token is set in cookie by backend;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

//* AUTH APIs
export const authAPI = {
  register: (data: {
    name: string;
    phone: string;
    email?: string;
    password: string;
  }) => api.post("/auth/register", data),

  login: (data: { phone: string; password: string }) =>
    api.post("/auth/login", data),

  logout: () => api.post("/logout"),

  getProfile: () => api.get("/me/profile"),

  getUserProfile: (userId: string) => api.get(`/user/${userId}`),

  updateProfile: (data: {
    name?: string;
    about?: string;
    avatar?: string;
    gender?: string;
    email?: string;
  }) => api.patch("/me/update-profile", data),

  searchUsers: (search: string) => api.get(`/auth/users?search=${search}`),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    console.log("Frontend: Sending user avatar upload", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    return api.post("/me/upload-avatar", formData);
  },
};

//* CHAT APIs
export const chatAPI = {
  accessChat: (userId: string) => api.post("/chat/access-chat", { userId }),

  fetchChats: () => api.get("/chat/fetch-chat"),

  createGroup: (name: string, userIds: string[]) =>
    api.post("/chat/create-group", { name, userIds }),

  renameGroup: (chatId: string, name: string) =>
    api.put("/chat/rename-group", { chatId, name }),

  addToGroup: (chatId: string, userId: string) =>
    api.put("/chat/add-to-group", { chatId, userId }),

  removeFromGroup: (chatId: string, userId: string) =>
    api.put("/chat/remove-from-group", { chatId, userId }),

  leaveGroup: (chatId: string) => api.delete(`/chat/leave-group/${chatId}`),
};

//* MESSAGE APIs
export const messageAPI = {
  getMessages: (chatId: string) => api.get(`/message/get-messages/${chatId}`),

  sendMessage: (chatId: string, content: string) =>
    api.post("/message/send-message", { chatId, content }),

  sendMedia: (chatId: string, file: File) => {
    const formData = new FormData();
    formData.append("chatId", chatId);
    formData.append("file", file);
    return api.post("/message/send-media", formData);
  },

  deleteMessage: (messageId: string) =>
    api.delete(`/message/delete-message/${messageId}`),

  markChatAsRead: (chatId: string) => api.put(`/message/mark-read/${chatId}`),

  getUnreadCount: (chatId: string) =>
    api.get(`/message/unread-count/${chatId}`),

  getAllUnreadCounts: () => api.get("/message/unread-counts"),

  // New message features
  editMessage: (messageId: string, content: string) =>
    api.put(`/message/edit/${messageId}`, { content }),

  addReaction: (messageId: string, emoji: string) =>
    api.post(`/message/reaction/${messageId}`, { emoji }),

  removeReaction: (messageId: string) =>
    api.delete(`/message/reaction/${messageId}`),

  pinMessage: (messageId: string, chatId: string) =>
    api.post(`/message/pin/${messageId}`, { chatId }),

  unpinMessage: (messageId: string, chatId: string) =>
    api.post(`/message/unpin/${messageId}`, { chatId }),

  getPinnedMessage: (chatId: string) => api.get(`/message/pinned/${chatId}`),

  sendMessageWithReply: (chatId: string, content: string, replyToId?: string) =>
    api.post("/message/send-message", { chatId, content, replyToId }),
};

//* GROUP APIs (Extended)
export const groupAPI = {
  updateDescription: (chatId: string, description: string) =>
    api.put(`/chat/update-description/${chatId}`, { description }),

  updateAvatar: (chatId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    console.log("Frontend: Sending group avatar upload", {
      chatId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    return api.put(`/chat/update-avatar/${chatId}`, formData);
  },
};

//* INVITE APIs
export const inviteAPI = {
  createInviteLink: (chatId: string, expiresAt?: string, maxUses?: number) =>
    api.post(`/invite/create/${chatId}`, { expiresAt, maxUses }),

  getInviteLinks: (chatId: string) => api.get(`/invite/list/${chatId}`),

  joinViaInvite: (code: string) => api.post("/invite/join", { code }),

  revokeInviteLink: (linkId: string) => api.delete(`/invite/revoke/${linkId}`),
};

//* BLOCK APIs
export const blockAPI = {
  blockUser: (userId: string) => api.post("/block/block", { userId }),

  unblockUser: (userId: string) => api.post("/block/unblock", { userId }),

  getBlockedUsers: () => api.get("/block/list"),
};

//* STATUS APIs
export const statusAPI = {
  createStatus: (file?: File, content?: string, type: string = "TEXT") => {
    const formData = new FormData();
    if (content) formData.append("content", content);
    if (file) {
      formData.append("file", file);
    }
    formData.append("type", type);
    return api.post("/status/create", formData);
  },

  getStatuses: () => api.get("/status/all"),

  getMyStatuses: () => api.get("/status/my"),

  viewStatus: (statusId: string) => api.post(`/status/view/${statusId}`),

  addReaction: (statusId: string, emoji: string) =>
    api.post(`/status/reaction/${statusId}`, { emoji }),

  removeReaction: (statusId: string) =>
    api.delete(`/status/reaction/${statusId}`),

  deleteStatus: (statusId: string) => api.delete(`/status/delete/${statusId}`),
};

//* TOTP APIs
export const totpAPI = {
  generateTOTP: () => api.post("/totp/generate"),

  enableTOTP: (token: string) => api.post("/totp/enable", { token }),

  disableTOTP: (token: string) => api.post("/totp/disable", { token }),
};

export default api;
