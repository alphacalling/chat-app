// client/src/apis/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    // If FormData, remove Content-Type header to let axios set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Auth-check request: 401 is expected when not logged in — don't refresh/redirect (avoids loop on login page)
    const isAuthCheck = originalRequest?.url?.includes?.("/api/me/profile");
    if (isAuthCheck) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token is in httpOnly cookie - send with credentials
        await api.post("/api/auth/refresh");
        // New access token is set in cookie by backend; retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login (only if not already there to avoid reload loop)
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH APIs
// ============================================
export const authAPI = {
  register: (data: { name: string; phone: string; email?: string; password: string }) =>
    api.post("/api/auth/register", data),

  login: (data: { phone: string; password: string }) =>
    api.post("/api/auth/login", data),

  logout: () =>
    api.post("/api/logout"),

  getProfile: () =>
    api.get("/api/me/profile"),

  getUserProfile: (userId: string) =>
    api.get(`/api/user/${userId}`),

  updateProfile: (data: { name?: string; about?: string; avatar?: string; gender?: string; email?: string }) =>
    api.patch("/api/me/update-profile", data),

  searchUsers: (search: string) =>
    api.get(`/api/auth/users?search=${search}`),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    console.log("🔍 Frontend: Sending user avatar upload", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    // Don't set Content-Type header - let axios set it automatically with boundary
    return api.post("/api/me/upload-avatar", formData);
  },
};

// ============================================
// CHAT APIs
// ============================================
export const chatAPI = {
  accessChat: (userId: string) =>
    api.post("/api/chat/access-chat", { userId }),

  fetchChats: () =>
    api.get("/api/chat/fetch-chat"),

  createGroup: (name: string, userIds: string[]) =>
    api.post("/api/chat/create-group", { name, userIds }),

  renameGroup: (chatId: string, name: string) =>
    api.put("/api/chat/rename-group", { chatId, name }),

  addToGroup: (chatId: string, userId: string) =>
    api.put("/api/chat/add-to-group", { chatId, userId }),

  removeFromGroup: (chatId: string, userId: string) =>
    api.put("/api/chat/remove-from-group", { chatId, userId }),

  leaveGroup: (chatId: string) =>
    api.delete(`/api/chat/leave-group/${chatId}`),
};

// ============================================
// MESSAGE APIs
// ============================================
export const messageAPI = {
  getMessages: (chatId: string) =>
    api.get(`/api/message/get-messages/${chatId}`),

  sendMessage: (chatId: string, content: string) =>
    api.post("/api/message/send-message", { chatId, content }),

  sendMedia: (chatId: string, file: File) => {
    const formData = new FormData();
    formData.append("chatId", chatId);
    formData.append("file", file);
    // Don't set Content-Type header - let axios set it automatically with boundary
    return api.post("/api/message/send-media", formData);
  },

  deleteMessage: (messageId: string) =>
    api.delete(`/api/message/delete-message/${messageId}`),

  markChatAsRead: (chatId: string) =>
    api.put(`/api/message/mark-read/${chatId}`),

  getUnreadCount: (chatId: string) =>
    api.get(`/api/message/unread-count/${chatId}`),

  getAllUnreadCounts: () =>
    api.get("/api/message/unread-counts"),

  // New message features
  editMessage: (messageId: string, content: string) =>
    api.put(`/api/message/edit/${messageId}`, { content }),

  addReaction: (messageId: string, emoji: string) =>
    api.post(`/api/message/reaction/${messageId}`, { emoji }),

  removeReaction: (messageId: string) =>
    api.delete(`/api/message/reaction/${messageId}`),

  pinMessage: (messageId: string, chatId: string) =>
    api.post(`/api/message/pin/${messageId}`, { chatId }),

  unpinMessage: (messageId: string, chatId: string) =>
    api.post(`/api/message/unpin/${messageId}`, { chatId }),

  getPinnedMessage: (chatId: string) =>
    api.get(`/api/message/pinned/${chatId}`),

  sendMessageWithReply: (chatId: string, content: string, replyToId?: string) =>
    api.post("/api/message/send-message", { chatId, content, replyToId }),
};

// ============================================
// GROUP APIs (Extended)
// ============================================
export const groupAPI = {
  updateDescription: (chatId: string, description: string) =>
    api.put(`/api/chat/update-description/${chatId}`, { description }),

  updateAvatar: (chatId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    console.log("🔍 Frontend: Sending group avatar upload", {
      chatId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    // Don't set Content-Type header - let axios set it automatically with boundary
    return api.put(`/api/chat/update-avatar/${chatId}`, formData);
  },
};

// ============================================
// INVITE APIs
// ============================================
export const inviteAPI = {
  createInviteLink: (chatId: string, expiresAt?: string, maxUses?: number) =>
    api.post(`/api/invite/create/${chatId}`, { expiresAt, maxUses }),

  getInviteLinks: (chatId: string) =>
    api.get(`/api/invite/list/${chatId}`),

  joinViaInvite: (code: string) =>
    api.post("/api/invite/join", { code }),

  revokeInviteLink: (linkId: string) =>
    api.delete(`/api/invite/revoke/${linkId}`),
};

// ============================================
// BLOCK APIs
// ============================================
export const blockAPI = {
  blockUser: (userId: string) =>
    api.post("/api/block/block", { userId }),

  unblockUser: (userId: string) =>
    api.post("/api/block/unblock", { userId }),

  getBlockedUsers: () =>
    api.get("/api/block/list"),
};

// ============================================
// STATUS APIs
// ============================================
export const statusAPI = {
  createStatus: (file?: File, content?: string, type: string = "TEXT") => {
    const formData = new FormData();
    if (content) formData.append("content", content);
    if (file) {
      formData.append("file", file);
    }
    formData.append("type", type);
    // Don't set Content-Type header - let axios set it automatically with boundary
    return api.post("/api/status/create", formData);
  },

  getStatuses: () =>
    api.get("/api/status/all"),

  getMyStatuses: () =>
    api.get("/api/status/my"),

  viewStatus: (statusId: string) =>
    api.post(`/api/status/view/${statusId}`),

  addReaction: (statusId: string, emoji: string) =>
    api.post(`/api/status/reaction/${statusId}`, { emoji }),

  removeReaction: (statusId: string) =>
    api.delete(`/api/status/reaction/${statusId}`),

  deleteStatus: (statusId: string) =>
    api.delete(`/api/status/delete/${statusId}`),
};

// ============================================
// TOTP APIs
// ============================================
export const totpAPI = {
  generateTOTP: () =>
    api.post("/api/totp/generate"),

  enableTOTP: (token: string) =>
    api.post("/api/totp/enable", { token }),

  disableTOTP: (token: string) =>
    api.post("/api/totp/disable", { token }),
};

export default api;