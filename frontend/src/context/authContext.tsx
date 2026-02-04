import { createContext, useState, useEffect } from "react";
import api from "../apis/api";

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  about?: string;
  isOnline?: boolean;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      try {
        const response = await api.get("/api/me/profile");
        
        // Handle both formats: response.data or response.data.data
        const userData = response.data.data || response.data;
        
        console.log("✅ Profile fetched:", userData);
        setUser(userData);
      } catch (err: any) {
        console.log("❌ Auth check failed:", err.response?.data || err.message);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        delete api.defaults.headers.common["Authorization"];
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (phone: string, password: string): Promise<void> => {
    const response = await api.post("/api/auth/login", { phone, password });

    console.log("📦 Full response:", response.data);

    // ✅ FIX: Access response.data.data
    const { user: userData, tokens } = response.data.data;

    console.log("✅ User:", userData);
    console.log("✅ Tokens:", tokens);

    // Save tokens
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);

    // Set axios header
    api.defaults.headers.common["Authorization"] = `Bearer ${tokens.accessToken}`;

    // Set user state - this triggers navigation
    setUser(userData);

    console.log("✅ Login complete, user set!");
  };

  const register = async (name: string, phone: string, password: string): Promise<void> => {
    const response = await api.post("/api/auth/register", { name, phone, password });
    console.log("✅ Register response:", response.data);
    // Registration successful, user needs to login
  };

  const logout = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await api.post("/logout", { refreshToken });
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      delete api.defaults.headers.common["Authorization"];
      setUser(null);
      console.log("✅ Logged out");
    }
  };

  useEffect(() => {
    console.log("🔄 Auth state changed - User:", user?.name || "null", "Loading:", loading);
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};