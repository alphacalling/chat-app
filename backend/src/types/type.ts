import type { MessageType, MessageStatus } from "../utils/enum.js";
import type { Request } from "express";
import type { User } from "@prisma/client";

// User types
export interface IUser {
  id: string;
  phone: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  about: string;
  isOnline: boolean;
  lastSeen: Date;
}

// Socket Events - Server to Client
export interface ServerToClientEvents {
  "user:online": (userId: string) => void;
  "user:offline": (data: { userId: string; lastSeen: Date }) => void;
  "message:new": (message: IMessage) => void;
  "message:delivered": (data: { messageId: string; deliveredAt: Date }) => void;
  "message:read": (data: { messageId: string; readAt: Date }) => void;
  "typing:start": (data: { chatId: string; userId: string }) => void;
  "typing:stop": (data: { chatId: string; userId: string }) => void;
  error: (error: { message: string }) => void;
}

// Socket Events - Client to Server
export interface ClientToServerEvents {
  "user:connect": (userId: string) => void;
  "message:send": (
    data: ISendMessage,
    callback: (response: IMessageResponse) => void
  ) => void;
  "message:delivered": (messageId: string) => void;
  "message:read": (data: { messageId: string; chatId: string }) => void;
  "typing:start": (chatId: string) => void;
  "typing:stop": (chatId: string) => void;
  "chat:join": (chatId: string) => void;
  "chat:leave": (chatId: string) => void;
}

// Message types
export interface IMessage {
  id: string;
  content: string | null;
  type: MessageType;
  status: "SENT" | "DELIVERED" | "READ";
  senderId: string;
  chatId: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface ISendMessage {
  content: string;
  chatId: string;
  type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  replyToId?: string;
}

export interface IMessageResponse {
  success: boolean;
  message?: IMessage;
  error?: string;
}

// For Socket.IO typing
export interface SocketData {
  userId: string;
  user: IUser;
}

// User without sensitive fields
export type SafeUser = Omit<User, "password" | "refreshToken">;

// Extended Request with user
export interface AuthRequest extends Request {
  user?: SafeUser;
}

// Auth DTOs
export interface RegisterDTO {
  phone: string;
  name: string;
  email?: string;
  password: string;
}

export interface LoginDTO {
  phone: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  phone: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
