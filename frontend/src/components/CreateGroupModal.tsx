import { useState } from "react";
import { authAPI } from "../apis/api";
import {
  Users,
  Search,
  X,
  CheckCircle2,
  Sparkles,
  UserPlus,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

interface CreateGroupModalProps {
  onGroupCreated: (group: any) => void;
  onClose: () => void;
}

const CreateGroupModal = ({
  onGroupCreated,
  onClose,
}: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  console.log("CreateGroupModal state:", {
    groupName: groupName.trim(),
    groupNameLength: groupName.trim().length,
    selectedUsersCount: selectedUsers.length,
    selectedUsers: selectedUsers.map((u) => u.name),
    isButtonDisabled:
      creating || !groupName.trim() || selectedUsers.length === 0,
  });

  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      setLoading(true);
      const { data } = await authAPI.searchUsers(search);
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (user: User) => {
    console.log("Toggle user:", user.name);
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) {
        const newList = prev.filter((u) => u.id !== user.id);
        console.log(
          "User removed. New list:",
          newList.map((u) => u.name),
        );
        return newList;
      }
      const newList = [...prev, user];
      console.log(
        "User added. New list:",
        newList.map((u) => u.name),
      );
      return newList;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert("Please enter a group name and select at least one member");
      return;
    }

    try {
      setCreating(true);
      const { chatAPI } = await import("../apis/api");
      const { data } = await chatAPI.createGroup(
        groupName,
        selectedUsers.map((u) => u.id),
      );
      onGroupCreated(data.data);
      onClose();
    } catch (error) {
      console.error("Error creating group", error);
      alert("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="bg-slate-800 p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Create New Group</h2>
              <p className="text-slate-300 text-xs">
                Add members to start chatting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-slate-700 p-2 rounded-full transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Name Input */}
        <div className="p-5 border-b-2 border-gray-200 bg-gray-50">
          <label className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-600" />
            Group Name
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full bg-white text-gray-800 rounded-xl px-4 py-3 outline-none border-2 border-gray-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all duration-300 font-medium"
            placeholder="Enter group name..."
            value={groupName}
            onChange={(e) => {
              console.log("Group name changed:", e.target.value);
              setGroupName(e.target.value);
            }}
            autoFocus
          />
        </div>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="p-5 border-b-2 border-gray-200 bg-emerald-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Selected Members ({selectedUsers.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-700 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-in zoom-in duration-300"
                >
                  <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold">{user.name}</span>
                  <button
                    onClick={() => toggleUser(user)}
                    className="text-slate-300 hover:text-white hover:bg-slate-600 rounded-full p-0.5 transition-all duration-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Users */}
        <div className="p-5 border-b-2 border-gray-200 bg-white">
          <label className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-600" />
            Add Members
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-gray-50 text-gray-800 rounded-xl px-4 py-3 outline-none border-2 border-gray-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all duration-300"
              placeholder="Search users to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-slate-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-64 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="text-center text-gray-600 p-8">
              <div className="animate-spin h-8 w-8 border-4 border-slate-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="font-medium">Searching users...</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => {
              const isSelected = selectedUsers.find((u) => u.id === user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className={`flex items-center gap-3 p-4 cursor-pointer border-b border-gray-200 last:border-0 transition-all duration-300 ${
                    isSelected
                      ? "bg-emerald-50 border-l-4 border-l-emerald-600"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg transition-all duration-300 ${
                      isSelected ? "bg-emerald-600" : "bg-gray-500"
                    }`}
                  >
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-800 font-bold truncate">
                      {user.name}
                    </div>
                    <div className="text-gray-600 text-xs truncate">
                      {user.phone}
                    </div>
                  </div>
                  {isSelected ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in zoom-in duration-300">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="text-sm">Added</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-600 font-semibold">
                      <UserPlus className="w-5 h-5" />
                      <span className="text-sm">Add</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-600 p-8">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">
                Search for users to add to the group
              </p>
            </div>
          )}
        </div>

        {/* Create Button */}
        <div className="p-5 border-t-2 border-gray-200 bg-gray-50">
          {/* Validation Messages */}
          <div className="mb-3 min-h-[20px]">
            {!groupName.trim() && (
              <div className="text-xs text-red-600 flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg animate-in slide-in-from-top duration-300">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                Please enter a group name
              </div>
            )}
            {groupName.trim() && selectedUsers.length === 0 && (
              <div className="text-xs text-orange-600 flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg animate-in slide-in-from-top duration-300">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                Please select at least one member
              </div>
            )}
            {groupName.trim() && selectedUsers.length > 0 && (
              <div className="text-xs text-emerald-600 flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg animate-in slide-in-from-top duration-300">
                <CheckCircle2 className="w-4 h-4" />
                Ready to create your group!
              </div>
            )}
          </div>

          <button
            onClick={handleCreateGroup}
            disabled={
              creating || !groupName.trim() || selectedUsers.length === 0
            }
            className="w-full bg-slate-700 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-500 shadow-xl hover:shadow-2xl hover:scale-[1.02] disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full"></div>
                <span>Creating Group...</span>
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                <span>Create Group</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;