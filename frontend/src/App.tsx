import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import JoinInvitePage from "./components/JoinInvitePage";
import { useAuth } from "./context/useAuth";

const Home = () => {
  const [selectedChat, setSelectedChat] = useState<any>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-whatsapp-dark">
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <div className="hidden md:flex md:w-1/3 lg:w-1/3">
        <Sidebar onSelectChat={setSelectedChat} />
      </div>
      {/* Chat Window - full width on mobile, 2/3 on desktop */}
      <div className="w-full md:w-2/3">
        <ChatWindow selectedChat={selectedChat} onChatUpdate={setSelectedChat} />
      </div>
    </div>
  );
};

// Loading component
const LoadingScreen = () => (
  <div className="h-screen flex items-center justify-center bg-gray-900">
    <div className="text-center">
      <div className="animate-spin h-12 w-12 border-4 border-whatsapp-green border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-white">Loading...</p>
    </div>
  </div>
);

function App() {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return <LoadingScreen />;
  }

  console.log("🔄 App rendered - User:", user?.name || "null");

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/chat" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/chat"
        element={user ? <Home /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={user ? <Navigate to="/chat" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/chat" replace /> : <Register />}
      />

      <Route
        path="/join/:code"
        element={<JoinInvitePage />}
      />

      <Route
        path="*"
        element={
          user ? (
            <Navigate to="/chat" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
