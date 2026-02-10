import { format } from "date-fns";
import { useState } from "react";
import MessageContextMenu from "./MessageContextMenu";
import EmojiPicker from "./EmojiPicker";
import {
  Check,
  CheckCheck,
  Pin,
  Trash2,
  Image,
  Video,
  FileText,
  Music,
} from "lucide-react";
import { cn } from "../lib/utils";
import { messageAPI } from "../apis/api";
import { useAuth } from "../context/useAuth";

interface Message {
  id: string;
  content: string | null;
  status: string;
  senderId: string;
  createdAt: string;
  type?: string;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  isEdited?: boolean;
  editedAt?: string;
  pinnedAt?: string | null;
  replyTo?: any;
  reactions?: any[];
  sender: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGroup?: boolean;
  chatId?: string;
  onDelete?: () => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
}

const MessageBubble = ({
  message,
  isOwn,
  isGroup,
  chatId,
  onDelete,
  onReply,
  onEdit,
}: MessageBubbleProps) => {
  const { user: currentUser } = useAuth();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [emojiPickerPos, setEmojiPickerPos] = useState({ x: 0, y: 0 });

  const timeStr = format(new Date(message.createdAt), "HH:mm");
  const isDeleted =
    message.status === "DELETED" ||
    message.content === "This message was deleted";
  const isPinned = !!message.pinnedAt;

  const StatusIcon = () => {
    if (!isOwn || isDeleted) return null;
    if (message.status === "READ") {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    } else if (message.status === "DELIVERED") {
      return <CheckCheck className="h-4 w-4 text-stone-400" />;
    } else {
      return <Check className="h-4 w-4 text-stone-400" />;
    }
  };

  const isMedia =
    message.type &&
    ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"].includes(message.type);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDeleted) {
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content || "");
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }

    try {
      await messageAPI.editMessage(message.id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  const handleReact = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (e) {
      setEmojiPickerPos({ x: e.clientX, y: e.clientY - 300 });
    } else {
      setEmojiPickerPos({
        x: window.innerWidth / 2 - 180,
        y: window.innerHeight / 2 - 200,
      });
    }
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = async (emoji: string) => {
    try {
      const existingReaction = message.reactions?.find(
        (r: any) => r.user?.id === currentUser?.id,
      );

      if (existingReaction) {
        if (existingReaction.emoji === emoji) {
          await messageAPI.removeReaction(message.id);
        } else {
          await messageAPI.addReaction(message.id, emoji);
        }
      } else {
        await messageAPI.addReaction(message.id, emoji);
      }
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const handlePin = async () => {
    if (!chatId) return;
    try {
      if (isPinned) {
        await messageAPI.unpinMessage(message.id, chatId);
      } else {
        await messageAPI.pinMessage(message.id, chatId);
      }
    } catch (error) {
      console.error("Failed to pin/unpin message:", error);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex gap-2 items-end group relative mb-1",
          isOwn ? "justify-end flex-row-reverse" : "justify-start",
        )}
      >
        {/* Pinned Indicator */}
        {isPinned && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-50 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 text-xs text-amber-700 border-2 border-amber-200 shadow-lg animate-in fade-in zoom-in duration-300 z-10">
            <Pin className="h-3 w-3" />
            <span className="font-semibold">Pinned</span>
          </div>
        )}

        {/* Avatar for group chats */}
        {isGroup && !isOwn && (
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-1 shadow-lg ring-2 ring-white">
            {message.sender.avatar ? (
              <img
                src={message.sender.avatar}
                alt={message.sender.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              message.sender.name?.charAt(0).toUpperCase() || "?"
            )}
          </div>
        )}

        <div
          onContextMenu={handleContextMenu}
          className={cn(
            "max-w-[75%] md:max-w-md px-4 py-3 cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
            isOwn
              ? "bg-teal-50 text-stone-800 rounded-2xl rounded-br-md shadow-lg shadow-teal-100/50 hover:shadow-xl hover:shadow-teal-100/60 border border-teal-100"
              : "bg-white text-stone-800 rounded-2xl rounded-bl-md shadow-lg shadow-stone-200/50 hover:shadow-xl hover:shadow-stone-200/60 border-2 border-stone-200",
            isDeleted && "opacity-70",
            !isDeleted && "hover:scale-[1.01]",
            isPinned && "ring-2 ring-amber-300 ring-offset-2",
          )}
        >
          {/* Reply Preview */}
          {message.replyTo && (
            <div
              className={cn(
                "mb-3 pl-3 border-l-4 rounded-lg py-2 px-3 cursor-pointer transition-all duration-300 hover:opacity-80",
                isOwn
                  ? "border-l-teal-500 bg-teal-100/50"
                  : "border-l-teal-600 bg-stone-50",
              )}
              onClick={() => {
                const element = document.getElementById(
                  `message-${message.replyTo.id}`,
                );
                element?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }}
            >
              <p className="text-xs font-bold text-teal-700 mb-0.5">
                {message.replyTo.sender?.name || "Unknown"}
              </p>
              <p className="text-xs text-stone-500 truncate">
                {message.replyTo.content || "📎 Media"}
              </p>
            </div>
          )}

          {/* Sender Name (for groups) */}
          {isGroup && !isOwn && (
            <p className="text-teal-700 text-xs font-bold mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-teal-600 rounded-full"></span>
              {message.sender.name}
            </p>
          )}

          {/* Deleted Message */}
          {isDeleted ? (
            <div className="flex items-center gap-2 text-stone-500 italic">
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">This message was deleted</span>
            </div>
          ) : (
            <>
              {/* Editing Mode */}
              {isEditing && isOwn ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-white text-stone-800 rounded-xl p-3 text-sm resize-none outline-none border-2 border-teal-400 focus:ring-4 focus:ring-teal-400/20 transition-all duration-300"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        handleSaveEdit();
                      }
                      if (e.key === "Escape") {
                        setIsEditing(false);
                      }
                    }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-stone-500 hover:text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition-all duration-300 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="text-xs bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-all duration-300 font-semibold shadow-lg shadow-teal-600/30"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Media Content */}
                  {isMedia && message.mediaUrl ? (
                    <div className="mb-3 -mx-1">
                      {message.type === "IMAGE" && (
                        <div className="relative group/media">
                          <img
                            src={message.mediaUrl}
                            alt="Media"
                            className="max-w-full rounded-xl cursor-pointer hover:opacity-95 transition-all duration-300 shadow-lg"
                            onClick={() =>
                              window.open(message.mediaUrl || "", "_blank")
                            }
                            onError={(e) => {
                              console.error(
                                "Failed to load image:",
                                message.mediaUrl,
                              );
                              (e.target as HTMLImageElement).alt =
                                "Failed to load image";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 rounded-xl transition-all duration-300 flex items-center justify-center">
                            <Image className="h-8 w-8 text-white opacity-0 group-hover/media:opacity-100 transition-all duration-300 drop-shadow-lg" />
                          </div>
                        </div>
                      )}
                      {message.type === "VIDEO" && (
                        <div className="relative">
                          <video
                            src={message.mediaUrl}
                            controls
                            className="max-w-full rounded-xl shadow-lg"
                            onError={() => {
                              console.error(
                                "Failed to load video:",
                                message.mediaUrl,
                              );
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                            <Video className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      {message.type === "AUDIO" && (
                        <div className="bg-stone-50 rounded-xl p-3 flex items-center gap-3 border border-stone-200">
                          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center shadow-lg">
                            <Music className="h-5 w-5 text-white" />
                          </div>
                          <audio
                            src={message.mediaUrl}
                            controls
                            className="flex-1 h-10"
                            onError={() => {
                              console.error(
                                "Failed to load audio:",
                                message.mediaUrl,
                              );
                            }}
                          />
                        </div>
                      )}
                      {message.type === "DOCUMENT" && (
                        <a
                          href={message.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-stone-700 hover:text-teal-700 p-3 bg-stone-50 rounded-xl transition-all duration-300 hover:shadow-md group/doc border-2 border-stone-200 hover:border-teal-400"
                        >
                          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover/doc:scale-110 transition-transform duration-300">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">
                              {message.fileName || "Document"}
                            </p>
                            {message.fileSize && (
                              <p className="text-xs text-stone-500 mt-0.5">
                                {(message.fileSize / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                        </a>
                      )}
                    </div>
                  ) : null}

                  {/* Text Content */}
                  {message.content && (
                    <p className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}

                  {/* Edited Tag */}
                  {message.isEdited && (
                    <p className="text-xs text-stone-500 italic mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 bg-stone-400 rounded-full"></span>
                      edited
                    </p>
                  )}

                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 -mb-1">
                      {Object.entries(
                        message.reactions.reduce((acc: any, r: any) => {
                          const emoji = r.emoji;
                          if (!acc[emoji]) acc[emoji] = [];
                          acc[emoji].push(r);
                          return acc;
                        }, {}),
                      ).map(([emoji, reactions]: [string, any]) => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmojiSelect(emoji);
                          }}
                          className={cn(
                            "text-sm px-2.5 py-1 rounded-full transition-all duration-300 flex items-center gap-1.5 hover:scale-110",
                            isOwn
                              ? "bg-teal-100 hover:bg-teal-200"
                              : "bg-stone-100 hover:bg-stone-200",
                          )}
                        >
                          <span className="text-base">{emoji}</span>
                          <span className="text-xs font-bold text-stone-500">
                            {reactions.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Time and Status */}
          <div
            className={cn(
              "flex items-center gap-2 justify-end text-xs mt-2",
              "text-stone-500",
            )}
          >
            <span className="font-medium">{timeStr}</span>
            <StatusIcon />
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <MessageContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onDelete={onDelete}
          onReply={handleReply}
          onEdit={isOwn ? handleEdit : undefined}
          onReact={handleReact}
          onPin={chatId ? handlePin : undefined}
          onClose={() => setShowContextMenu(false)}
          isOwn={isOwn}
          isPinned={isPinned}
        />
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
          position={emojiPickerPos}
        />
      )}
    </>
  );
};

export default MessageBubble;
