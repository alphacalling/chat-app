import { useState, useEffect } from "react";
import { statusAPI } from "../apis/api";
import { useAuth } from "../context/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Camera, Plus, X, Sparkles, ImageIcon, Type } from "lucide-react";
import StatusViewer from "./StatusViewer";

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
  views?: any[];
  reactions?: any[];
}

const StatusSection = () => {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerStatuses, setViewerStatuses] = useState<Status[]>([]);
  const [statusContent, setStatusContent] = useState("");
  const [statusFile, setStatusFile] = useState<File | null>(null);
  const [statusType, setStatusType] = useState<"TEXT" | "IMAGE" | "VIDEO">(
    "TEXT",
  );
  const [creating, setCreating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [showMyStatusPicker, setShowMyStatusPicker] = useState(false);

  useEffect(() => {
    fetchStatuses();
    fetchMyStatuses();
    const interval = setInterval(() => {
      fetchStatuses();
      fetchMyStatuses();
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const fetchStatuses = async () => {
    try {
      const { data } = await statusAPI.getStatuses();
      setStatuses(data.data || []);
    } catch (error) {
      console.error("Failed to fetch statuses:", error);
    }
  };

  const fetchMyStatuses = async () => {
    try {
      const { data } = await statusAPI.getMyStatuses();
      setMyStatuses(data.data || []);
    } catch (error) {
      console.error("Failed to fetch my statuses:", error);
    }
  };

  const handleCreateStatus = async () => {
    if (!statusContent && !statusFile) {
      alert("Please add content or media");
      return;
    }

    try {
      setCreating(true);
      await statusAPI.createStatus(
        statusFile || undefined,
        statusContent || undefined,
        statusType,
      );
      setShowCreate(false);
      setStatusContent("");
      setStatusFile(null);
      setPreviewUrl("");
      setStatusType("TEXT");
      await Promise.all([fetchStatuses(), fetchMyStatuses()]);
    } catch (error) {
      console.error("Failed to create status:", error);
      alert("Failed to create status");
    } finally {
      setCreating(false);
    }
  };

  const handleViewStatus = (userStatuses: any[], index: number) => {
    const allStatuses = userStatuses.flatMap(
      (group: any) => group.statuses || [],
    );
    setViewerStatuses(allStatuses);
    setViewerIndex(index);
    setShowViewer(true);
    setShowMyStatusPicker(false);
  };

  const handleMyStatusClick = () => {
    if (myStatuses.length > 0) {
      setShowMyStatusPicker(true);
    } else {
      setShowCreate(true);
    }
  };

  const openViewerFromPicker = (index: number) => {
    setViewerStatuses(myStatuses);
    setViewerIndex(index);
    setShowViewer(true);
    setShowMyStatusPicker(false);
  };

  const openCreateFromPicker = () => {
    setShowMyStatusPicker(false);
    setShowCreate(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStatusFile(file);
      if (file.type.startsWith("image/")) {
        setStatusType("IMAGE");
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else if (file.type.startsWith("video/")) {
        setStatusType("VIDEO");
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const clearFile = () => {
    setStatusFile(null);
    setPreviewUrl("");
    setStatusType("TEXT");
  };

  return (
    <div className="bg-gray-50 border-b-2 border-gray-200 p-4">
      <ScrollArea className="w-full">
        <div className="flex gap-4">
          {/* My Status */}
          <div
            className="flex-shrink-0 cursor-pointer group"
            onClick={handleMyStatusClick}
          >
            <div className="relative">
              <Avatar
                className={`h-15 w-15 m-1 ring-4 transition-all duration-300 group-hover:scale-105 ${
                  myStatuses.length > 0
                    ? "ring-slate-600 shadow-lg shadow-slate-600/30"
                    : "ring-gray-300"
                }`}
              >
                <AvatarImage
                  src={
                    user?.avatar
                      ? `${user.avatar}${user.avatar.includes("?") ? "&" : "?"}t=${Date.now()}`
                      : undefined
                  }
                  key={user?.avatar}
                />
                <AvatarFallback className="bg-slate-600 text-white font-bold text-lg">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-slate-700 rounded-full p-2 border-3 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-800 font-semibold mt-2 text-center truncate w-16">
              My Status
            </p>
            {myStatuses.length > 0 && (
              <p className="text-xs text-gray-600 text-center">
                {myStatuses.length}{" "}
                {myStatuses.length === 1 ? "update" : "updates"}
              </p>
            )}
          </div>

          {/* Other Statuses */}
          {statuses.map((userStatus) => {
            const hasUnviewed = userStatus.statuses.some((s: Status) => {
              const views = s.views || [];
              return !views.find((v: any) => v.userId === user?.id);
            });

            return (
              <div
                key={userStatus.user.id}
                className="flex-shrink-0 cursor-pointer group"
                onClick={() => handleViewStatus([userStatus], 0)}
              >
                <div className="relative">
                  <Avatar
                    className={`h-16 w-16 ring-4 transition-all duration-300 group-hover:scale-105 ${
                      hasUnviewed
                        ? "ring-slate-600 shadow-lg shadow-slate-600/30"
                        : "ring-gray-300"
                    }`}
                  >
                    <AvatarImage src={userStatus.user.avatar || undefined} />
                    <AvatarFallback className="bg-gray-500 text-white font-bold text-lg">
                      {userStatus.user.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {hasUnviewed && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                      <span className="text-white text-xs font-bold">
                        {
                          userStatus.statuses.filter(
                            (s: Status) =>
                              !(s.views || []).find(
                                (v: any) => v.userId === user?.id,
                              ),
                          ).length
                        }
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-800 font-semibold mt-2 text-center truncate w-16">
                  {userStatus.user.name.split(" ")[0]}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Create Status Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md bg-white border-2 border-gray-200 rounded-3xl shadow-2xl">
          <DialogHeader className="border-b-2 border-gray-200 pb-4">
            <DialogTitle className="text-gray-800 flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-slate-600" />
              Create Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Text Input */}
            <div>
              <label className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Type className="h-4 w-4 text-slate-600" />
                What's on your mind?
              </label>
              <Input
                value={statusContent}
                onChange={(e) => setStatusContent(e.target.value)}
                placeholder="Share your thoughts..."
                className="bg-gray-50 border-2 border-gray-200 focus:border-slate-400 rounded-xl h-12"
              />
            </div>

            {/* Media Upload */}
            <div>
              <label className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-600" />
                Add Media (optional)
              </label>

              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                  {statusType === "IMAGE" ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <video
                      src={previewUrl}
                      className="w-full h-48 object-cover"
                      controls
                    />
                  )}
                  <button
                    onClick={clearFile}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="border-3 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all duration-300 group">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Camera className="h-8 w-8 text-slate-600" />
                    </div>
                    <p className="text-gray-800 font-semibold mb-1">
                      Click to upload
                    </p>
                    <p className="text-gray-600 text-xs">Images or Videos</p>
                  </div>
                </label>
              )}
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreateStatus}
              disabled={creating || (!statusContent && !statusFile)}
              className="w-full bg-slate-700 hover:bg-slate-800 rounded-xl h-12 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Creating...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Share Status
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* My Status Picker - when you have statuses, choose view or add new */}
      <Dialog open={showMyStatusPicker} onOpenChange={setShowMyStatusPicker}>
        <DialogContent className="max-w-sm bg-white border-2 border-gray-200 rounded-2xl shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-gray-200">
            <DialogTitle className="text-gray-800 text-lg font-bold">
              My Status
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[320px] overflow-y-auto">
            {myStatuses.map((status, index) => (
              <button
                key={status.id}
                type="button"
                onClick={() => openViewerFromPicker(index)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center">
                  {status.type === "IMAGE" && status.mediaUrl ? (
                    <img
                      src={status.mediaUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : status.type === "VIDEO" && status.mediaUrl ? (
                    <video
                      src={status.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <Type className="h-6 w-6 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-medium truncate">
                    {status.type === "TEXT" && status.content
                      ? status.content
                      : status.type === "IMAGE"
                        ? "Photo"
                        : status.type === "VIDEO"
                          ? "Video"
                          : "Status"}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {new Date(status.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={openCreateFromPicker}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left border-t-2 border-dashed border-gray-300"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-400">
                <Plus className="h-7 w-7 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="text-slate-700 font-semibold">Add new status</p>
                <p className="text-gray-600 text-xs">Share a new update</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Viewer */}
      {showViewer && (
        <StatusViewer
          statuses={viewerStatuses}
          currentIndex={viewerIndex}
          onClose={() => {
            setShowViewer(false);
            fetchStatuses();
            fetchMyStatuses();
          }}
          onNext={() =>
            setViewerIndex((prev) =>
              Math.min(prev + 1, viewerStatuses.length - 1),
            )
          }
          onPrev={() => setViewerIndex((prev) => Math.max(prev - 1, 0))}
          onStatusUpdate={(updatedStatus) => {
            setViewerStatuses((prev) =>
              prev.map((s) => (s.id === updatedStatus.id ? updatedStatus : s)),
            );
          }}
        />
      )}
    </div>
  );
};

export default StatusSection;
