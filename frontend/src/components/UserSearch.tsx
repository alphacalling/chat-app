import { useState } from "react";
import api from "../apis/api";
import type { Chat } from "./Sidebar";
import { Search, X, MessageCircle, UserPlus, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface User {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

interface UserSearchProps {
  onChatAccessed: (chat: Chat) => void;
  onClose: () => void;
}

const UserSearch = ({ onChatAccessed, onClose }: UserSearchProps) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      setLoading(true);
      const { data } = await api.get(`/auth/users?search=${search}`);
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setLoading(false);
    }
  };

  const accessChat = async (userId: string) => {
    try {
      setLoadingChatId(userId);
      const { data } = await api.post("/chat/access-chat", { userId });
      onChatAccessed(data.data || data);
      onClose();
    } catch (error) {
      console.error("Error accessing chat", error);
    } finally {
      setLoadingChatId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-16 p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-in zoom-in slide-in-from-top-4 duration-500">
        {/* Header */}
        <div className="bg-slate-800 p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">New Chat</h2>
              <p className="text-slate-300 text-xs">
                Search for users to start chatting
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

        {/* Search Input */}
        <div className="p-4 bg-gray-50 border-b-2 border-gray-200">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                className="w-full bg-white pl-11 pr-4 h-12 rounded-xl border-2 border-gray-200 focus:border-slate-400 text-gray-800"
                placeholder="Search name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoFocus
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !search.trim()}
              className="bg-slate-700 hover:bg-slate-800 h-12 px-6 rounded-xl font-bold shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-10 w-10 border-4 border-slate-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Searching users...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-2">
              {searchResults.map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => accessChat(user.id)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-100 cursor-pointer rounded-xl transition-all duration-300 border-2 border-transparent hover:border-slate-200 group animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Avatar className="h-14 w-14 ring-2 ring-gray-200 group-hover:ring-slate-400 transition-all duration-300">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="bg-slate-600 text-white font-bold text-lg">
                      {user.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-800 font-bold truncate">
                      {user.name}
                    </div>
                    <div className="text-gray-600 text-xs truncate">
                      {user.phone}
                    </div>
                  </div>
                  {loadingChatId === user.id ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="animate-spin h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full" />
                      <span className="text-xs font-semibold">Opening...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-600 group-hover:text-slate-700 transition-colors">
                      <UserPlus className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : search ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-800 font-bold mb-1">No users found</p>
              <p className="text-gray-600 text-sm">
                Try searching with a different name or phone number
              </p>
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-gray-800 font-bold mb-1">Search for users</p>
              <p className="text-gray-600 text-sm">
                Enter a name or phone number to find users
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;
