"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  token: string | null;
  role: string | null;
  login: (token: string, role: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Load auth from localStorage on mount
    const savedToken = localStorage.getItem("lms_token");
    const savedRole = localStorage.getItem("lms_role");
    if (savedToken) {
      setToken(savedToken);
      setRole(savedRole);
    }
  }, []);

  const login = (newToken: string, newRole: string) => {
    setToken(newToken);
    setRole(newRole);
    localStorage.setItem("lms_token", newToken);
    localStorage.setItem("lms_role", newRole);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_role");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
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
