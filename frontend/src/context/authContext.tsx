import { createContext, useState, useEffect } from "react";
import api from "../apis/api";

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  about?: string;
  gender?: string;
  isOnline?: boolean;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (
    phone: string,
    password: string,
    totpToken?: string,
  ) => Promise<{ requiresTOTP?: boolean; user?: any }>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updated: Partial<User> | null) => void;
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
      try {
        const response = await api.get("/me/profile");

        const userData = response.data.data || response.data;

        console.log("Profile fetched:", userData);
        setUser(userData);
      } catch (err: any) {
        console.log("Auth check failed:", err.response?.data || err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (
    phone: string,
    password: string,
    totpToken?: string,
  ): Promise<{ requiresTOTP?: boolean; user?: any }> => {
    const response = await api.post("/auth/login", {
      phone,
      password,
      totpToken,
    });

    console.log("Full response:", response.data);

    const responseData = response.data.data;

    // Check if TOTP is required
    if (responseData.requiresTOTP) {
      console.log("TOTP required for user:", responseData.user);
      return { requiresTOTP: true, user: responseData.user };
    }

    // Normal login flow
    const { user: userData } = responseData;

    console.log("User:", userData);
    console.log("Tokens stored in httpOnly cookies (secure)");
    setUser(userData);

    console.log("Login complete, user set!");
    return { requiresTOTP: false };
  };

  const register = async (
    name: string,
    phone: string,
    password: string,
  ): Promise<void> => {
    const response = await api.post("/auth/register", {
      name,
      phone,
      password,
    });
    console.log("Register response:", response.data);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/logout");
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      setUser(null);
      console.log("Logged out");
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await api.get("/me/profile");
      const userData = response.data.data || response.data;
      console.log("User profile refreshed:", userData);
      setUser(userData);
    } catch (err: any) {
      console.error(
        "Failed to refresh user profile:",
        err.response?.data || err.message,
      );
    }
  };

  const updateUser = (updated: Partial<User> | null): void => {
    if (updated === null) {
      setUser(null);
      return;
    }
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  useEffect(() => {
    console.log(
      "Auth state changed - User:",
      user?.name || "null",
      "Loading:",
      loading,
    );
  }, [user, loading]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
