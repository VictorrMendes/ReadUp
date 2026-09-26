import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";

const TOKEN_KEY = "readup.access_token";

type TokenResponse = { access_token: string; token_type: string };

export type User = {
  id: number;
  name: string;
  email: string;
  english_level: string | null;
  created_at: string;
};

async function saveToken(response: TokenResponse): Promise<string> {
  await SecureStore.setItemAsync(TOKEN_KEY, response.access_token);
  return response.access_token;
}

export async function login(email: string, password: string): Promise<string> {
  return saveToken(
    await apiFetch<TokenResponse>("/auth/login", { method: "POST", body: { email, password } }),
  );
}

export async function register(name: string, email: string, password: string): Promise<string> {
  return saveToken(
    await apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    }),
  );
}

export function logout(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

type AuthContextValue = {
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then(setToken)
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setToken(await login(email, password));
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setToken(await register(name, email, password));
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return value;
}

// GET /users/me; token expirado/inválido (401) encerra a sessão.
export function useCurrentUser(): { user: User | null; error: string | null } {
  const { token, signOut } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiFetch<User>("/users/me", { token })
      .then((me) => active && setUser(me))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          void signOut();
        } else if (active) {
          setError(e instanceof ApiError ? e.detail : "Não foi possível carregar seus dados.");
        }
      });
    return () => {
      active = false;
    };
  }, [token, signOut]);

  return { user, error };
}
