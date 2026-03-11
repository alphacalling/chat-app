import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import JoinInvitePage from "./components/JoinInvitePage";
import { useAuth } from "./context/useAuth";

const Home = () => {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const handleSelectChat = (chat: any) => {
    setSelectedChat(chat);
    if (isMobile) {
      setShowSidebarOnMobile(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-whatsapp-dark">
      {/* Sidebar */}
      {isMobile ? (
        showSidebarOnMobile && (
          <div className="w-full h-full">
            <Sidebar onSelectChat={handleSelectChat} />
          </div>
        )
      ) : (
        <div className="w-[380px] max-w-sm h-full">
          <Sidebar onSelectChat={handleSelectChat} />
        </div>
      )}

      {/* Chat Window */}
      {(!isMobile || !showSidebarOnMobile) && (
        <div className="flex-1 min-w-0 h-full">
          <ChatWindow
            selectedChat={selectedChat}
            onChatUpdate={setSelectedChat}
            onBack={isMobile ? () => setShowSidebarOnMobile(true) : undefined}
          />
        </div>
      )}
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
