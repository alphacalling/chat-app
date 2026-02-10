import { useState, useEffect } from "react";
import { authAPI, blockAPI } from "../apis/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import {
  Phone,
  Mail,
  User,
  Calendar,
  Ban,
  CheckCircle,
  Info,
  Clock,
} from "lucide-react";
import { useAuth } from "../context/useAuth";

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userAvatar?: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  avatar?: string | null;
  about: string;
  gender?: string | null;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

const UserProfileModal = ({
  open,
  onClose,
  userId,
  userName,
  userAvatar,
}: UserProfileModalProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
      checkBlockedStatus();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    if (!userId) {
      console.error("❌ No userId provided");
      return;
    }

    try {
      setLoading(true);
      console.log("🔍 Fetching profile for userId:", userId);

      const response = await authAPI.getUserProfile(userId);
      const { data } = response;

      if (data.success && data.data) {
        setProfile(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch profile");
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch profile:", error);
      const statusCode = error.response?.status;

      if (statusCode === 404 || statusCode === 403) {
        setTimeout(() => onClose(), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkBlockedStatus = async () => {
    try {
      const { data } = await blockAPI.getBlockedUsers();
      const blocked = data.data || [];
      setIsBlocked(blocked.some((u: any) => u.id === userId));
    } catch (error) {
      console.error("Failed to check blocked status:", error);
    }
  };

  const handleBlock = async () => {
    try {
      setBlocking(true);
      if (isBlocked) {
        await blockAPI.unblockUser(userId);
        setIsBlocked(false);
      } else {
        await blockAPI.blockUser(userId);
        setIsBlocked(true);
      }
    } catch (error: any) {
      console.error("Failed to block/unblock user:", error);
      alert(error.response?.data?.message || "Failed to update block status");
    } finally {
      setBlocking(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  const getGenderLabel = (gender?: string | null) => {
    if (!gender) return "Not specified";
    switch (gender.toUpperCase()) {
      case "MALE":
        return "Male";
      case "FEMALE":
        return "Female";
      case "OTHER":
        return "Other";
      default:
        return gender;
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-2 border-gray-200 rounded-3xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-0">
          {/* Header with Avatar */}
          <div className="bg-slate-800 p-8 pb-12">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32 ring-4 ring-slate-600 shadow-2xl">
                <AvatarImage
                  src={profile?.avatar || userAvatar || undefined}
                  alt={profile?.name || userName}
                />
                <AvatarFallback className="bg-slate-600 text-white text-4xl font-bold">
                  {(profile?.name || userName)?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <DialogTitle className="text-white text-2xl font-bold mb-2">
                  {profile?.name || userName}
                </DialogTitle>
                <div className="flex items-center justify-center gap-2 bg-slate-700 px-4 py-1.5 rounded-full">
                  {profile?.isOnline ? (
                    <>
                      <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                      <p className="text-white text-sm font-medium">Online</p>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 text-slate-300" />
                      <p className="text-slate-300 text-sm">
                        {formatLastSeen(
                          profile?.lastSeen || new Date().toISOString(),
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto -mt-6">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin h-10 w-10 border-4 border-slate-600 border-t-transparent rounded-full mb-3" />
                <p className="text-gray-600 text-sm">Loading profile...</p>
              </div>
            ) : profile ? (
              <div className="space-y-4">
                {/* About */}
                {profile.about && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-600 text-xs font-bold mb-1 flex items-center gap-1">
                      <Info className="h-3 w-3" /> About
                    </p>
                    <p className="text-gray-800 font-medium">{profile.about}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-4 w-4 text-slate-600" />
                      <p className="text-gray-600 text-xs font-bold">Phone</p>
                    </div>
                    <p className="text-gray-800 text-sm font-medium truncate">
                      {profile.phone}
                    </p>
                  </div>

                  {profile.email && (
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-slate-600" />
                        <p className="text-gray-600 text-xs font-bold">Email</p>
                      </div>
                      <p className="text-gray-800 text-sm font-medium truncate">
                        {profile.email}
                      </p>
                    </div>
                  )}

                  {profile.gender && (
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-slate-600" />
                        <p className="text-gray-600 text-xs font-bold">
                          Gender
                        </p>
                      </div>
                      <p className="text-gray-800 text-sm font-medium">
                        {getGenderLabel(profile.gender)}
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 p-3 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      <p className="text-gray-600 text-xs font-bold">Joined</p>
                    </div>
                    <p className="text-gray-800 text-sm font-medium">
                      {formatDate(profile.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Failed to load profile</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {profile && user?.id !== userId && (
          <div className="p-5 border-t-2 border-gray-200 bg-gray-50">
            <Button
              onClick={handleBlock}
              disabled={blocking}
              className={`w-full rounded-xl h-12 font-bold shadow-lg transition-all duration-300 ${
                isBlocked
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {blocking ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Processing...</span>
                </div>
              ) : isBlocked ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Unblock User
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5 mr-2" />
                  Block User
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
