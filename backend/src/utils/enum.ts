export const MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
  "STICKER",
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_STATUSES = ["SENT", "DELIVERED", "READ"] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
