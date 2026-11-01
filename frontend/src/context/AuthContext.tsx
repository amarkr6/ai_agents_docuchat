/**
 * FILE: context/AuthContext.tsx
 * PURPOSE: Global "who is logged in?" state, available to every component.
 *
 * React Context lets any component call `useAuth()` to get the current user
 * and the login/register/logout functions — without passing props down
 * through every level.
 *
 * On page refresh we read the token from localStorage and ask the backend
 * (/auth/me) who it belongs to.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMeApi, loginApi, registerApi } from "../api/auth.api";
import { TOKEN_STORAGE_KEY } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean; // true while we check the saved token on startup
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load: restore the session if a token is saved
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        setUser(await getMeApi());
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY); // token invalid/expired
      } finally {
        setIsLoading(false);
      }
    }
    void restoreSession();
  }, []);

  async function login(email: string, password: string) {
    const result = await loginApi(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setUser(result.user);
  }

  async function register(name: string, email: string, password: string) {
    const result = await registerApi(name, email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setUser(result.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

/** Hook to read auth state:  const { user, logout } = useAuth(); */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
