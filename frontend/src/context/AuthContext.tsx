/**
 * EXAMOS - Auth Context
 * Global authentication state management with JWT token handling.
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, User } from "@/services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("examos_token");
    const storedUser = localStorage.getItem("examos_user");

    if (storedToken && storedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(storedToken);
      setUser(JSON.parse(storedUser));

      // Verify token is still valid
      api.getMe().then((userData) => {
        setUser(userData);
        localStorage.setItem("examos_user", JSON.stringify(userData));
      }).catch(() => {
        // Token expired, clear session
        localStorage.removeItem("examos_token");
        localStorage.removeItem("examos_user");
        setToken(null);
        setUser(null);
      });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem("examos_token", response.access_token);
    localStorage.setItem("examos_user", JSON.stringify(response.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("examos_token");
    localStorage.removeItem("examos_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
