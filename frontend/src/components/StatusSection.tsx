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
  const [statusType, setStatusType] = useState<"TEXT" | "IMAGE" | "VIDEO">("TEXT");
  const [creating, setCreating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

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
      await statusAPI.createStatus(statusFile || undefined, statusContent || undefined, statusType);
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
    const allStatuses = userStatuses.flatMap((group: any) => group.statuses || []);
    setViewerStatuses(allStatuses);
    setViewerIndex(index);
    setShowViewer(true);
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
    <div className="bg-gradient-to-r from-whatsapp-light to-white border-b-2 border-whatsapp-border p-4">
      <ScrollArea className="w-full">
        <div className="flex gap-4">
          {/* My Status */}
          <div
            className="flex-shrink-0 cursor-pointer group"
            onClick={() => myStatuses.length > 0 
              ? handleViewStatus([{ user, statuses: myStatuses }], 0)
              : setShowCreate(true)
            }
          >
            <div className="relative">
              <Avatar className={`h-16 w-16 ring-4 transition-all duration-300 group-hover:scale-105 ${
                myStatuses.length > 0 
                  ? 'ring-whatsapp-green shadow-lg shadow-whatsapp-green/30' 
                  : 'ring-gray-300'
              }`}>
                <AvatarImage 
                  src={user?.avatar 
                    ? `${user.avatar}${user.avatar.includes('?') ? '&' : '?'}t=${Date.now()}`
                    : undefined
                  }
                  key={user?.avatar}
                />
                <AvatarFallback className="bg-gradient-to-br from-whatsapp-green to-green-600 text-white font-bold text-lg">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-whatsapp-green to-green-600 rounded-full p-2 border-3 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="text-xs text-whatsapp-text font-semibold mt-2 text-center truncate w-16">
              My Status
            </p>
            {myStatuses.length > 0 && (
              <p className="text-xs text-whatsapp-secondary text-center">
                {myStatuses.length} {myStatuses.length === 1 ? 'update' : 'updates'}
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
                  <Avatar className={`h-16 w-16 ring-4 transition-all duration-300 group-hover:scale-105 ${
                    hasUnviewed 
                      ? 'ring-whatsapp-green shadow-lg shadow-whatsapp-green/30' 
                      : 'ring-gray-300'
                  }`}>
                    <AvatarImage src={userStatus.user.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-500 text-white font-bold text-lg">
                      {userStatus.user.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {hasUnviewed && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                      <span className="text-white text-xs font-bold">
                        {userStatus.statuses.filter((s: Status) => 
                          !(s.views || []).find((v: any) => v.userId === user?.id)
                        ).length}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-whatsapp-text font-semibold mt-2 text-center truncate w-16">
                  {userStatus.user.name.split(' ')[0]}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Create Status Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md bg-white border-2 border-whatsapp-border rounded-3xl shadow-2xl">
          <DialogHeader className="border-b-2 border-whatsapp-border pb-4">
            <DialogTitle className="text-whatsapp-text flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-whatsapp-green" />
              Create Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Text Input */}
            <div>
              <label className="text-sm font-bold text-whatsapp-text mb-2 flex items-center gap-2">
                <Type className="h-4 w-4 text-whatsapp-green" />
                What's on your mind?
              </label>
              <Input
                value={statusContent}
                onChange={(e) => setStatusContent(e.target.value)}
                placeholder="Share your thoughts..."
                className="bg-whatsapp-light/50 border-2 border-whatsapp-border focus:border-whatsapp-green rounded-xl h-12"
              />
            </div>

            {/* Media Upload */}
            <div>
              <label className="text-sm font-bold text-whatsapp-text mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-whatsapp-green" />
                Add Media (optional)
              </label>
              
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-whatsapp-border">
                  {statusType === "IMAGE" ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                  ) : (
                    <video src={previewUrl} className="w-full h-48 object-cover" controls />
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
                  <div className="border-3 border-dashed border-whatsapp-border rounded-xl p-8 text-center cursor-pointer hover:border-whatsapp-green hover:bg-whatsapp-green/5 transition-all duration-300 group">
                    <div className="w-16 h-16 bg-gradient-to-br from-whatsapp-green/20 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Camera className="h-8 w-8 text-whatsapp-green" />
                    </div>
                    <p className="text-whatsapp-text font-semibold mb-1">Click to upload</p>
                    <p className="text-whatsapp-secondary text-xs">Images or Videos</p>
                  </div>
                </label>
              )}
            </div>

            {/* Create Button */}
            <Button 
              onClick={handleCreateStatus} 
              disabled={creating || (!statusContent && !statusFile)}
              className="w-full bg-gradient-to-r from-whatsapp-green to-green-600 hover:from-green-600 hover:to-whatsapp-green rounded-xl h-12 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          onNext={() => setViewerIndex((prev) => Math.min(prev + 1, viewerStatuses.length - 1))}
          onPrev={() => setViewerIndex((prev) => Math.max(prev - 1, 0))}
          onStatusUpdate={(updatedStatus) => {
            setViewerStatuses((prev) =>
              prev.map((s) => (s.id === updatedStatus.id ? updatedStatus : s))
            );
          }}
        />
      )}
    </div>
  );
};

export default StatusSection;