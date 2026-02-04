import { useState } from "react";
import api from "../apis/api";
import type { Chat } from "./Sidebar";


interface User {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

interface UserSearchProps {
  onChatAccessed: (chat: Chat) => void; // Sidebar ko batane ke liye
  onClose: () => void;
}

const UserSearch = ({ onChatAccessed, onClose }: UserSearchProps) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Search Users API call
  // Note: Backend mein GET /api/user?search=... route hona chahiye
  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      setLoading(true);
      // Example Endpoint: GET /api/auth/users?search=keyword
      // Agar ye route nahi hai, to banana padega, ya filhal dummy list use kar sakte ho
      const { data } = await api.get(`/auth/users?search=${search}`);
      setSearchResults(data.data || data); 
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setLoading(false);
    }
  };

  // Chat Create/Access API call
  const accessChat = async (userId: string) => {
    try {
      setLoadingChat(true);
      
      // Ye wo Backend API hai jo humne pehle discuss ki thi
      const { data } = await api.post("/chat/access-chat", { userId });
      console.log("data", data);
      

      // Sidebar function ko call karo naye data ke saath
      onChatAccessed(data.data || data); 
      onClose();
    } catch (error) {
      console.error("Error accessing chat", error);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-whatsapp-dark w-96 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-white font-semibold">New Chat</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Search Input */}
        <div className="p-4 flex gap-2">
          <input
            type="text"
            className="flex-1 bg-whatsapp-panel text-white rounded px-3 py-2 outline-none border border-transparent focus:border-whatsapp-green"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            className="bg-whatsapp-green text-white px-4 py-2 rounded font-medium hover:opacity-90"
          >
            Go
          </button>
        </div>

        {/* Results */}
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 p-4">Searching...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div
                key={user.id}
                onClick={() => accessChat(user.id)}
                className="flex items-center gap-3 p-3 hover:bg-whatsapp-panel cursor-pointer border-b border-gray-800 last:border-0"
              >
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium">{user.name}</div>
                  <div className="text-gray-400 text-xs">{user.phone}</div>
                </div>
                {loadingChat && <span className="ml-auto text-xs text-whatsapp-green">Opening...</span>}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 p-4">No users found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;