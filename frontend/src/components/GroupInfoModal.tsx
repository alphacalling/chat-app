  import { useState, useEffect } from "react";
  import { chatAPI, authAPI, groupAPI, inviteAPI } from "../apis/api";
  import { useAuth } from "../context/useAuth";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
  import { Button } from "./ui/button";
  import { Input } from "./ui/input";
  import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
  import { ScrollArea } from "./ui/scroll-area";
  import {
    Edit,
    X,
    Camera,
    Link as LinkIcon,
    Copy,
    Trash2,
    UserPlus,
    UserMinus,
    LogOut,
    Shield,
    Search,
    CheckCircle2,
    Share2,
  } from "lucide-react";

  interface GroupUser {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    isOnline?: boolean;
  }

  interface GroupInfoModalProps {
    chat: {
      id: string;
      chatName: string | null;
      isGroupChat: boolean;
      users: GroupUser[];
      avatar?: string | null;
      description?: string | null;
    };
    onClose: () => void;
    onGroupUpdated: (updatedChat: any) => void;
  }

  const GroupInfoModal = ({
    chat,
    onClose,
    onGroupUpdated,
  }: GroupInfoModalProps) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [newName, setNewName] = useState(chat.chatName || "");
    const [description, setDescription] = useState(chat.description || "");
    const [showAddMember, setShowAddMember] = useState(false);
    const [showInviteLinks, setShowInviteLinks] = useState(false);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState<GroupUser[]>([]);
    const [inviteLinks, setInviteLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentChat, setCurrentChat] = useState(chat);
    const { user } = useAuth();

    const isAdmin = currentChat.users[0]?.id === user?.id;

    useEffect(() => {
      setCurrentChat(chat);
    }, [chat]);

    useEffect(() => {
      if (showInviteLinks && isAdmin) {
        fetchInviteLinks();
      }
    }, [showInviteLinks, isAdmin, chat.id]);

    const fetchInviteLinks = async () => {
      try {
        const { data } = await inviteAPI.getInviteLinks(currentChat.id);
        setInviteLinks(data.data || []);
      } catch (error) {
        console.error("Failed to fetch invite links:", error);
      }
    };

    const handleRename = async () => {
      if (!newName.trim()) return;
      try {
        const { data } = await chatAPI.renameGroup(currentChat.id, newName);
        setCurrentChat({
          ...currentChat,
          chatName: data.data.chatName || data.data.name,
        });
        onGroupUpdated(data.data);
        setIsRenaming(false);
      } catch (error) {
        console.error("Error renaming group", error);
        alert("Failed to rename group");
      }
    };

    const handleUpdateDescription = async () => {
      try {
        const { data } = await groupAPI.updateDescription(
          currentChat.id,
          description,
        );
        setCurrentChat({
          ...currentChat,
          description: data.data.description,
        });
        onGroupUpdated(data.data);
        setIsEditingDescription(false);
      } catch (error) {
        console.error("Error updating description", error);
        alert("Failed to update description");
      }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        console.log("Uploading group avatar:", file.name);
        const { data } = await groupAPI.updateAvatar(currentChat.id, file);
        console.log("Group avatar uploaded successfully:", data);

        const avatarUrl = data.data.avatar
          ? `${data.data.avatar}${data.data.avatar.includes("?") ? "&" : "?"}t=${Date.now()}`
          : null;

        const updatedChat = {
          ...currentChat,
          avatar: avatarUrl || data.data.avatar,
        };
        setCurrentChat(updatedChat);
        onGroupUpdated(data.data);
        alert("Group avatar updated successfully!");
      } catch (error: any) {
        console.error("Error uploading group avatar:", error);
        alert(error.response?.data?.message || "Failed to upload group avatar");
      }
    };

    const handleCreateInviteLink = async () => {
      try {
        const { data } = await inviteAPI.createInviteLink(currentChat.id);
        await fetchInviteLinks();
        const inviteUrl = `${window.location.origin}/join/${data.data.code}`;
        navigator.clipboard.writeText(inviteUrl);
        alert("Invite link copied to clipboard!");
      } catch (error) {
        console.error("Error creating invite link", error);
        alert("Failed to create invite link");
      }
    };

    const handleRevokeInviteLink = async (linkId: string) => {
      if (!confirm("Are you sure you want to revoke this invite link?")) return;
      try {
        await inviteAPI.revokeInviteLink(linkId);
        await fetchInviteLinks();
      } catch (error) {
        console.error("Error revoking invite link", error);
        alert("Failed to revoke invite link");
      }
    };

    const handleSearch = async () => {
      if (!search.trim()) return;
      try {
        setLoading(true);
        const { data } = await authAPI.searchUsers(search);
        const filtered = (data.data || []).filter(
          (u: GroupUser) => !currentChat.users.find((cu) => cu.id === u.id),
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error("Error searching users", error);
      } finally {
        setLoading(false);
      }
    };

    const handleAddMember = async (userId: string) => {
      try {
        const { data } = await chatAPI.addToGroup(chat.id, userId);
        onGroupUpdated(data.data);
        setShowAddMember(false);
        setSearch("");
        setSearchResults([]);
      } catch (error: any) {
        console.error("Error adding member", error);
        alert(error.response?.data?.message || "Failed to add member");
      }
    };

    const handleRemoveMember = async (userId: string) => {
      if (!confirm("Are you sure you want to remove this member?")) return;
      try {
        const { data } = await chatAPI.removeFromGroup(chat.id, userId);
        onGroupUpdated(data.data);
      } catch (error: any) {
        console.error("Error removing member", error);
        alert(error.response?.data?.message || "Failed to remove member");
      }
    };

    const handleLeaveGroup = async () => {
      if (!confirm("Are you sure you want to leave this group?")) return;
      try {
        await chatAPI.leaveGroup(chat.id);
        onClose();
        window.location.reload();
      } catch (error: any) {
        console.error("Error leaving group", error);
        alert(error.response?.data?.message || "Failed to leave group");
      }
    };

    const copyInviteLink = (code: string) => {
      const inviteUrl = `${window.location.origin}/join/${code}`;
      navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied to clipboard!");
    };

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] bg-white border-2 border-gray-200 rounded-3xl shadow-2xl">
          <DialogHeader className="border-b-2 border-gray-200 pb-4">
            <DialogTitle className="text-gray-800 flex items-center gap-2 text-xl font-bold">
              <Shield className="h-6 w-6 text-slate-600" />
              Group Settings
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
            <div className="space-y-6 py-2">
              {/* Group Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-28 w-28 ring-4 ring-slate-200 shadow-2xl transition-all duration-300 group-hover:ring-slate-300">
                    <AvatarImage
                      src={
                        currentChat.avatar
                          ? `${currentChat.avatar}${currentChat.avatar.includes("?") ? "&" : "?"}t=${Date.now()}`
                          : undefined
                      }
                      key={currentChat.avatar}
                    />
                    <AvatarFallback className="bg-slate-600 text-white text-3xl font-bold">
                      {currentChat.chatName?.charAt(0).toUpperCase() || "G"}
                    </AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <label className="absolute bottom-0 right-0 bg-slate-700 rounded-full p-3 cursor-pointer hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110">
                      <Camera className="h-5 w-5 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Group Name */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border-2 border-gray-200">
                {isRenaming ? (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-800">
                      Group Name
                    </label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-white text-gray-800 border-2 border-gray-200 focus:border-slate-400 h-12 rounded-xl"
                      // autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRename}
                        size="sm"
                        className="flex-1 bg-slate-700 hover:bg-slate-800 rounded-xl"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsRenaming(false);
                          setNewName(currentChat.chatName || "");
                        }}
                        size="sm"
                        className="flex-1 hover:bg-red-50 hover:text-red-600 rounded-xl"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-semibold mb-1">
                        Group Name
                      </p>
                      <h3 className="text-gray-800 font-bold text-lg">
                        {currentChat.chatName}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {currentChat.users.length} members
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsRenaming(true)}
                        className="h-10 w-10 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-all duration-300"
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Group Description */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-800">
                    Description
                  </label>
                  {isAdmin && !isEditingDescription && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingDescription(true)}
                      className="h-8 w-8 hover:bg-slate-100 hover:text-slate-700 rounded-xl"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a description..."
                      className="w-full bg-white border-2 border-gray-200 text-gray-800 rounded-xl px-4 py-3 text-sm resize-none min-h-[100px] focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all duration-300"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUpdateDescription}
                        size="sm"
                        className="flex-1 bg-slate-700 hover:bg-slate-800 rounded-xl"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsEditingDescription(false);
                          setDescription(chat.description || "");
                        }}
                        size="sm"
                        className="flex-1 hover:bg-red-50 hover:text-red-600 rounded-xl"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm min-h-[20px]">
                    {chat.description || "No description added yet"}
                  </p>
                )}
              </div>

              {/* Invite Links Section */}
              {isAdmin && (
                <div className="space-y-3 bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-blue-600" />
                      Invite Links
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInviteLinks(!showInviteLinks)}
                      className="text-blue-600 hover:bg-blue-100 rounded-xl"
                    >
                      {showInviteLinks ? "Hide" : "Show"}
                    </Button>
                  </div>
                  {showInviteLinks && (
                    <div className="space-y-3">
                      <Button
                        onClick={handleCreateInviteLink}
                        className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg"
                        size="sm"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Create New Invite Link
                      </Button>
                      {inviteLinks.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {inviteLinks.map((link) => (
                            <div
                              key={link.id}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-blue-200 shadow-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-800 text-xs font-mono font-bold truncate">
                                  {link.code}
                                </p>
                                <p className="text-gray-600 text-xs mt-1">
                                  Uses: {link.useCount}
                                  {link.maxUses && ` / ${link.maxUses}`}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyInviteLink(link.code)}
                                  className="h-8 w-8 hover:bg-blue-100 text-blue-600 rounded-xl"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRevokeInviteLink(link.id)}
                                  className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-xl"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Members List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-gray-800 font-bold flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-slate-600" />
                    Members ({chat.users.length})
                  </h4>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddMember(!showAddMember)}
                      className="text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Member
                    </Button>
                  )}
                </div>

                {/* Add Member Section */}
                {showAddMember && isAdmin && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="bg-white border-2 border-emerald-200 focus:border-slate-400 rounded-xl h-11"
                      />
                      <Button
                        onClick={handleSearch}
                        size="sm"
                        disabled={loading}
                        className="bg-slate-700 hover:bg-slate-800 rounded-xl px-4"
                      >
                        {loading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {searchResults.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleAddMember(u.id)}
                            className="flex items-center gap-3 p-3 hover:bg-white rounded-xl cursor-pointer transition-all duration-300 border-2 border-transparent hover:border-slate-200 group"
                          >
                            <Avatar className="h-10 w-10 ring-2 ring-emerald-200 group-hover:ring-slate-400 transition-all duration-300">
                              <AvatarFallback className="bg-gray-500 text-white text-sm font-bold">
                                {u.name[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-800 font-semibold text-sm truncate">
                                {u.name}
                              </p>
                              <p className="text-gray-600 text-xs truncate">
                                {u.phone}
                              </p>
                            </div>
                            <span className="text-slate-700 text-xs font-bold flex items-center gap-1">
                              <UserPlus className="h-4 w-4" />
                              Add
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Member List */}
                <div className="space-y-2">
                  {chat.users.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all duration-300 border-2 border-transparent hover:border-gray-200 group"
                    >
                      <Avatar className="h-12 w-12 ring-2 ring-gray-200 group-hover:ring-slate-400 transition-all duration-300">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback className="bg-slate-600 text-white font-bold">
                          {member.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-800 font-bold text-sm truncate">
                            {member.name}
                          </span>
                          {index === 0 && (
                            <span className="text-xs bg-slate-700 text-white px-3 py-1 rounded-full font-bold shadow-lg">
                              Admin
                            </span>
                          )}
                          {member.id === user?.id && (
                            <span className="text-xs text-gray-600 font-semibold">
                              (You)
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-xs truncate">
                          {member.phone}
                        </p>
                      </div>
                      {isAdmin && member.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          className="h-9 w-9 text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Group Button */}
              <div className="pt-4 border-t-2 border-gray-200">
                <Button
                  onClick={handleLeaveGroup}
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700 rounded-xl shadow-lg h-12 font-bold"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Leave Group
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  export default GroupInfoModal;
