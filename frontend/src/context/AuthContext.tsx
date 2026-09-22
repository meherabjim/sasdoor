"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthUser = Record<string, unknown>;

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  role: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (response: Record<string, unknown>) => void;
  logout: () => void;
  updateLocalUser: (data: Record<string, unknown>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractToken(response: Record<string, unknown>) {
  const data = asObject(response.data);
  const token =
    response.accessToken || response.token || data?.accessToken || data?.token;
  return typeof token === "string" && token ? token : null;
}

function extractUser(response: Record<string, unknown>) {
  const data = asObject(response.data);
  return asObject(response.user) || asObject(data?.user) || data;
}

export function getUserRole(user: AuthUser | null) {
  if (!user) return null;
  const roleObject = asObject(user.role);
  const raw =
    user.roleName || user.role || roleObject?.roleName || roleObject?.name;
  return typeof raw === "string" ? raw.toUpperCase() : null;
}

export function isAdminRole(role: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPERADMIN";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("authUser");
    setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("authUser");
      }
    }
    setHydrated(true);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = getUserRole(user);
    return {
      token,
      user,
      role,
      isAuthenticated: Boolean(token),
      hydrated,
      login: (response) => {
        const nextToken = extractToken(response);
        const nextUser = extractUser(response);
        if (nextToken) {
          localStorage.setItem("accessToken", nextToken);
          setToken(nextToken);
        }
        if (nextUser) {
          localStorage.setItem("authUser", JSON.stringify(nextUser));
          setUser(nextUser);
        }
      },
      logout: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("authUser");
        setToken(null);
        setUser(null);
      },
      updateLocalUser: (data) => {
        setUser((current) => {
          const updated = { ...(current ?? {}), ...data };
          localStorage.setItem("authUser", JSON.stringify(updated));
          return updated;
        });
      },
    };
  }, [token, user, hydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
