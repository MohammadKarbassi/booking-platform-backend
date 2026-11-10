"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthState = {
  user: User | null;
  /** false until the stored token has been checked against /auth/me */
  ready: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    // the token lives in localStorage, so it can only be checked after hydration
    const check = getToken()
      ? api<User>("/auth/me")
          .then(setUser)
          .catch(() => setToken(null))
      : Promise.resolve();
    check.finally(() => setReady(true));
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      qc.clear();
    };
    window.addEventListener("dor-iran:logout", onExpired);
    return () => window.removeEventListener("dor-iran:logout", onExpired);
  }, [qc]);

  const signIn = useCallback((token: string, u: User) => {
    setToken(token);
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut, setUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export const displayName = (u: User) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") || "مسافر";
