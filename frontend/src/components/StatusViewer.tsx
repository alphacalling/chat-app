import { useState, useEffect } from "react";
import { statusAPI } from "../apis/api";
import { useAuth } from "../context/useAuth";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import {
  X,
  Smile,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import EmojiPicker from "./EmojiPicker";

interface Status {
  id: string;
  userId: string;
  content?: string;
  mediaUrl?: string;
  type: "TEXT" | "IMAGE" | "VIDEO";
  expiresAt: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  views?: {
    userId: string;
    user?: { id: string; name: string; avatar?: string | null };
  }[];
  reactions?: {
    userId: string;
    emoji: string;
    user?: { id: string; name: string; avatar?: string | null };
  }[];
}

interface StatusViewerProps {
  statuses: Status[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onStatusUpdate?: (updatedStatus: Status) => void;
}

const StatusViewer = ({
  statuses,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onStatusUpdate,
}: StatusViewerProps) => {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<Status | null>(
    statuses[currentIndex] || null,
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewed, setViewed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showViewersPanel, setShowViewersPanel] = useState(false);

  useEffect(() => {
    setCurrentStatus(statuses[currentIndex] || null);
    setViewed(false);
  }, [currentIndex, statuses]);

  useEffect(() => {
    if (currentStatus && !viewed && currentStatus.userId !== user?.id) {
      const markAsViewed = async () => {
        try {
          await statusAPI.viewStatus(currentStatus.id);
          setViewed(true);
        } catch (error) {
          console.error("Failed to mark status as viewed:", error);
        }
      };
      markAsViewed();
    }
  }, [currentStatus, viewed, user?.id]);

  useEffect(() => {
    if (currentStatus?.type !== "VIDEO" && currentIndex < statuses.length - 1) {
      const timer = setTimeout(() => {
        onNext();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStatus, currentIndex, statuses.length, onNext]);

  const handleReaction = async (emoji: string) => {
    if (!currentStatus) return;
    try {
      const existingReaction = currentStatus.reactions?.find(
        (r: any) => r.user?.id === user?.id,
      );
      if (existingReaction && existingReaction.emoji === emoji) {
        await statusAPI.removeReaction(currentStatus.id);
      } else {
        await statusAPI.addReaction(currentStatus.id, emoji);
      }

      try {
        const isOwnStatus = currentStatus.userId === user?.id;
        let updatedStatus: Status | null = null;

        if (isOwnStatus) {
          const { data } = await statusAPI.getMyStatuses();
          updatedStatus =
            data.data.find((s: Status) => s.id === currentStatus.id) || null;
        } else {
          const { data } = await statusAPI.getStatuses();
          updatedStatus =
            data.data
              .flatMap((group: any) => group.statuses || [])
              .find((s: Status) => s.id === currentStatus.id) || null;
        }

        if (updatedStatus) {
          setCurrentStatus(updatedStatus);
          if (onStatusUpdate) {
            onStatusUpdate(updatedStatus);
          }
        }
      } catch (error) {
        console.error("Failed to refresh status:", error);
      }

      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const handleDelete = async () => {
    if (!currentStatus || currentStatus.userId !== user?.id) return;
    if (!confirm("Are you sure you want to delete this status?")) return;
    try {
      setDeleting(true);
      await statusAPI.deleteStatus(currentStatus.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete status:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (!currentStatus) return null;

  const isOwn = currentStatus.userId === user?.id;
  const progress = ((currentIndex + 1) / statuses.length) * 100;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 bg-transparent border-none shadow-none">
        <div className="relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 z-20 p-3">
            <div className="flex gap-1">
              {statuses.map((_, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-1 rounded-full overflow-hidden bg-white/30"
                >
                  <div
                    className={`h-full bg-white transition-all duration-300 ${
                      idx < currentIndex
                        ? "w-full"
                        : idx === currentIndex
                          ? "animate-pulse"
                          : "w-0"
                    }`}
                    style={{
                      width:
                        idx < currentIndex
                          ? "100%"
                          : idx === currentIndex
                            ? `${progress}%`
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-20 bg-black/70 p-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-white/50 shadow-lg">
                  <AvatarImage src={currentStatus.user?.avatar || undefined} />
                  <AvatarFallback className="bg-slate-600 text-white font-bold">
                    {(currentStatus.user?.name || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-bold">
                    {currentStatus.user?.name ?? "Unknown"}
                  </p>
                  <p className="text-white/70 text-xs">
                    {new Date(currentStatus.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" • "}
                    {currentIndex + 1} of {statuses.length}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Status Content */}
          <div className="relative min-h-[500px] flex items-center justify-center bg-gray-900">
            {currentStatus.type === "IMAGE" && currentStatus.mediaUrl && (
              <img
                src={currentStatus.mediaUrl}
                alt="Status"
                className="max-w-full max-h-[500px] object-contain"
              />
            )}
            {currentStatus.type === "VIDEO" && currentStatus.mediaUrl && (
              <video
                src={currentStatus.mediaUrl}
                controls
                autoPlay
                className="max-w-full max-h-[500px]"
              />
            )}
            {currentStatus.type === "TEXT" && (
              <div className="p-8 text-center bg-slate-700 w-full h-full min-h-[500px] flex items-center justify-center">
                <p className="text-white text-2xl font-bold leading-relaxed max-w-md">
                  {currentStatus.content}
                </p>
              </div>
            )}

            {/* Content Overlay for media with text */}
            {currentStatus.content && currentStatus.type !== "TEXT" && (
              <div className="absolute bottom-24 left-0 right-0 bg-black/80 p-6">
                <p className="text-white text-lg font-medium">
                  {currentStatus.content}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Reactions Display */}
                {currentStatus.reactions &&
                  currentStatus.reactions.length > 0 && (
                    <div className="flex gap-1 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      {Object.entries(
                        currentStatus.reactions.reduce((acc: any, r: any) => {
                          const emoji = r.emoji;
                          if (!acc[emoji]) acc[emoji] = [];
                          acc[emoji].push(r);
                          return acc;
                        }, {}),
                      ).map(([emoji, reactions]: [string, any]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(emoji)}
                          className="text-lg hover:scale-125 transition-transform"
                        >
                          {emoji}
                          <span className="text-white text-xs ml-0.5">
                            {reactions.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                {/* React Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(true)}
                  className="text-white hover:bg-white/20 rounded-full h-11 w-11"
                >
                  <Smile className="h-6 w-6" />
                </Button>

                {/* View count / Viewers panel toggle for own status */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => setShowViewersPanel((p) => !p)}
                    className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <Eye className="h-4 w-4 text-white" />
                    <span className="text-white text-sm font-semibold">
                      {currentStatus.views?.length ?? 0}
                    </span>
                    <span className="text-white/80 text-xs">
                      {(currentStatus.reactions?.length ?? 0) > 0 &&
                        ` • ${currentStatus.reactions?.length} reactions`}
                    </span>
                    {showViewersPanel ? (
                      <ChevronUp className="h-4 w-4 text-white" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white" />
                    )}
                  </button>
                )}
              </div>

              {/* Delete Button (own status) */}
              {isOwn && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-400 hover:bg-red-500/20 rounded-full h-11 w-11"
                >
                  {deleting ? (
                    <div className="animate-spin h-5 w-5 border-2 border-red-400 border-t-transparent rounded-full" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Viewed by & Reacted by panel (own status only) */}
          {isOwn && showViewersPanel && (
            <div className="absolute bottom-20 left-0 right-0 z-20 max-h-[280px] overflow-y-auto bg-black/90 backdrop-blur-sm border-t border-white/10 rounded-t-2xl p-4">
              <p className="text-white/80 text-xs font-semibold mb-3 uppercase tracking-wider">
                Viewed by ({currentStatus.views?.length ?? 0})
              </p>
              <div className="space-y-2 mb-4">
                {(currentStatus.views?.length ?? 0) === 0 ? (
                  <p className="text-white/50 text-sm">No views yet</p>
                ) : (
                  currentStatus.views?.map((v: any) => (
                    <div
                      key={v.userId}
                      className="flex items-center gap-3 text-white"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-white/30">
                        <AvatarImage src={v.user?.avatar || undefined} />
                        <AvatarFallback className="bg-slate-600 text-white text-xs">
                          {(v.user?.name || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {v.user?.name ?? "Unknown"}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-white/80 text-xs font-semibold mb-3 uppercase tracking-wider">
                Reacted by ({currentStatus.reactions?.length ?? 0})
              </p>
              <div className="space-y-2">
                {(currentStatus.reactions?.length ?? 0) === 0 ? (
                  <p className="text-white/50 text-sm">No reactions yet</p>
                ) : (
                  currentStatus.reactions?.map((r: any, idx: number) => (
                    <div
                      key={r.userId + String(idx)}
                      className="flex items-center gap-3 text-white"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-white/30">
                        <AvatarImage src={r.user?.avatar || undefined} />
                        <AvatarFallback className="bg-slate-600 text-white text-xs">
                          {(r.user?.name || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium flex-1">
                        {r.user?.name ?? "Unknown"}
                      </span>
                      <span className="text-lg" title={r.emoji}>
                        {r.emoji}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentIndex > 0 && (
            <button
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {currentIndex < statuses.length - 1 && (
            <button
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Click areas for navigation */}
          <div className="absolute inset-0 flex z-10">
            <div className="w-1/3 h-full cursor-pointer" onClick={onPrev} />
            <div className="w-1/3 h-full" />
            <div className="w-1/3 h-full cursor-pointer" onClick={onNext} />
          </div>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={handleReaction}
            onClose={() => setShowEmojiPicker(false)}
            position={{
              x: window.innerWidth / 2 - 160,
              y: window.innerHeight / 2,
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StatusViewer;
