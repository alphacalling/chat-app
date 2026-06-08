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
  totpEnabled?: boolean;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (
    phone: string,
    password: string,
    totpToken?: string,
  ) => Promise<{ requiresTOTP?: boolean; user?: any; totpResetToken?: string }>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updated: Partial<User> | null) => void;
  completeLogin: (user: User) => void;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth on app start — a 401 here is expected when not logged in
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const response = await api.get("/me/profile");
        const userData = response.data.data || response.data;
        if (!cancelled) setUser(userData);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (
    phone: string,
    password: string,
    totpToken?: string,
  ): Promise<{ requiresTOTP?: boolean; user?: any; totpResetToken?: string }> => {
    const response = await api.post("/auth/login", {
      phone,
      password,
      totpToken,
    });

    const responseData = response.data?.data;

    if (!responseData) {
      throw new Error("Unexpected server response");
    }

    if (responseData.requiresTOTP) {
      const totpResetToken =
        responseData.totpResetToken ??
        response.data?.totpResetToken ??
        null;
      return {
        requiresTOTP: true,
        user: responseData.user,
        totpResetToken,
      };
    }

    const { user: userData } = responseData;
    setUser(userData);
    return { requiresTOTP: false };
  };

  const register = async (
    name: string,
    phone: string,
    password: string,
  ): Promise<void> => {
    await api.post("/auth/register", { name, phone, password });
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/logout");
    } catch {
      // Logout endpoint may fail if token is already expired — that's fine
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await api.get("/me/profile");
      const userData = response.data.data || response.data;
      setUser(userData);
    } catch {
      // Silent fail — profile refresh is best-effort
    }
  };

  const completeLogin = (userData: User): void => {
    setUser(userData);
  };

  const updateUser = (updated: Partial<User> | null): void => {
    if (updated === null) {
      setUser(null);
      return;
    }
    setUser((prev) =>
      prev ? { ...prev, ...updated } : (updated as User),
    );
  };

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
        completeLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
