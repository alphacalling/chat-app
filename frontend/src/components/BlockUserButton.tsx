import { useState } from "react";
import { blockAPI } from "../apis/api";
import { Button } from "./ui/button";
import { Ban, UserCheck, Shield, ShieldOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

interface BlockUserButtonProps {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  isBlocked?: boolean;
  onBlockChange?: () => void;
}

export const BlockUserButton = ({
  userId,
  userName,
  userAvatar,
  isBlocked = false,
  onBlockChange,
}: BlockUserButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (
      !confirm(
        `Are you sure you want to ${isBlocked ? "unblock" : "block"} ${userName}?`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      if (isBlocked) {
        await blockAPI.unblockUser(userId);
      } else {
        await blockAPI.blockUser(userId);
      }
      onBlockChange?.();
    } catch (error: any) {
      console.error("Failed to block/unblock user:", error);
      alert(error.response?.data?.message || "Failed to update block status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBlock}
      disabled={loading}
      className={`transition-all duration-300 ${
        isBlocked
          ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          : "text-red-600 hover:text-red-700 hover:bg-red-50"
      }`}
    >
      {isBlocked ? (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          Unblock
        </>
      ) : (
        <>
          <Ban className="h-4 w-4 mr-2" />
          Block
        </>
      )}
    </Button>
  );
};

interface BlockedUsersListProps {
  open: boolean;
  onClose: () => void;
}

export const BlockedUsersList = ({ open, onClose }: BlockedUsersListProps) => {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedUsers = async () => {
    try {
      const { data } = await blockAPI.getBlockedUsers();
      setBlockedUsers(data.data || []);
    } catch (error) {
      console.error("Failed to fetch blocked users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await blockAPI.unblockUser(userId);
      await fetchBlockedUsers();
    } catch (error: any) {
      console.error("Failed to unblock user:", error);
      alert(error.response?.data?.message || "Failed to unblock user");
    }
  };

  if (open) {
    fetchBlockedUsers();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-gray-200 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-800 flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-red-500" />
            Blocked Users
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Manage users you have blocked
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96 pr-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin h-10 w-10 border-4 border-slate-600 border-t-transparent rounded-full mb-3"></div>
              <p className="text-gray-600 text-sm">Loading blocked users...</p>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-12">
              <ShieldOff className="h-16 w-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No blocked users</p>
              <p className="text-gray-500 text-sm mt-1">
                You haven't blocked anyone yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all duration-300 border border-transparent hover:border-gray-200 group"
                >
                  <Avatar className="h-12 w-12 ring-2 ring-gray-200 group-hover:ring-slate-400 transition-all duration-300">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="bg-red-500 text-white font-semibold">
                      {user.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 font-semibold text-sm truncate">
                      {user.name}
                    </p>
                    <p className="text-gray-600 text-xs truncate">
                      {user.phone}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnblock(user.id)}
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-300"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
