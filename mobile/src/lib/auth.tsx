import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import type { Level } from "@/lib/articles";
import { cancelReminders } from "@/lib/reminders";

const TOKEN_KEY = "readup.access_token";

type TokenResponse = { access_token: string; token_type: string };

export type User = {
  id: number;
  name: string;
  email: string;
  english_level: Level | null;
  created_at: string;
  daily_goal: number | null;
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

function fetchMe(token: string): Promise<User> {
  return apiFetch<User>("/users/me", { token });
}

type AuthContextValue = {
  token: string | null;
  user: User | null;
  // erro ao carregar o usuário (sem 401): o app mostra "tentar novamente"
  userError: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then(setToken)
      .finally(() => setTokenLoaded(true));
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    await cancelReminders();
    setUser(null);
    setUserError(null);
    setToken(null);
  }, []);

  const handleUserError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) void signOut();
      else setUserError(e instanceof ApiError ? e.detail : "Não foi possível carregar seus dados.");
    },
    [signOut],
  );

  // token salvo de uma sessão anterior: carrega o usuário antes de liberar as rotas
  useEffect(() => {
    if (!token || user || userError) return;
    let active = true;
    fetchMe(token)
      .then((me) => active && setUser(me))
      .catch((e: unknown) => active && handleUserError(e));
    return () => {
      active = false;
    };
  }, [token, user, userError, handleUserError]);

  // login/cadastro já trazem o usuário junto, sem tela em branco entre o formulário e o app
  const signIn = useCallback(async (email: string, password: string) => {
    const newToken = await login(email, password);
    setUser(await fetchMe(newToken));
    setToken(newToken);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const newToken = await register(name, email, password);
    setUser(await fetchMe(newToken));
    setToken(newToken);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      setUser(await fetchMe(token));
      setUserError(null);
    } catch (e) {
      handleUserError(e);
    }
  }, [token, handleUserError]);

  const isLoading = !tokenLoaded || (!!token && !user && !userError);

  return (
    <AuthContext.Provider
      value={{ token, user, userError, isLoading, signIn, signUp, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return value;
}
