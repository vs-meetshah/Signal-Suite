import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { CART_CLEARED_EVENT } from "@/components/cart-provider";
import type { User, InsertUser, AuthSignupInput } from "@shared/schema";

export type AuthMode = "login" | "signup";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthMode;
  openAuthModal: (options?: { onSuccess?: () => void; mode?: AuthMode }) => void;
  closeAuthModal: () => void;
  authModalOnSuccess: (() => void) | null;
  login: (email: string, password: string) => Promise<{ user: User }>;
  signup: (data: AuthSignupInput) => Promise<{ user: User }>;
  signupOrLogin: (data: AuthSignupInput) => Promise<{ user: User; isNewUser: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<InsertUser>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>("login");
  const [authModalOnSuccess, setAuthModalOnSuccess] = useState<(() => void) | null>(null);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const openAuthModal = useCallback((options?: { onSuccess?: () => void; mode?: AuthMode }) => {
    setAuthModalMode(options?.mode ?? "login");
    setAuthModalOnSuccess(() => options?.onSuccess ?? null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalOnSuccess(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const result = await res.json();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    return result;
  }, []);

  const signup = useCallback(async (data: AuthSignupInput) => {
    const res = await apiRequest("POST", "/api/auth/signup", data);
    const result = await res.json();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    return result;
  }, []);

  const signupOrLogin = useCallback(async (data: AuthSignupInput) => {
    const res = await apiRequest("POST", "/api/auth/signup-or-login", data);
    const result = await res.json();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    return result;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    window.dispatchEvent(new Event(CART_CLEARED_EVENT));
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  const updateProfile = useCallback(async (data: Partial<InsertUser>) => {
    const res = await apiRequest("POST", "/api/auth/update", data);
    const updated = await res.json();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    return updated;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        authModalOnSuccess,
        login,
        signup,
        signupOrLogin,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
