"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { ApiError } from "@/lib/api";
import { getMe, type User } from "@/lib/user";

export const ME_KEY = ["me"] as const;

export function useMe() {
  return useQuery<User, ApiError>({ queryKey: ME_KEY, queryFn: getMe });
}

async function sessionRequest(method: "POST" | "DELETE", body?: unknown): Promise<void> {
  const response = await fetch("/api/session", {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      typeof data?.detail === "string" ? data.detail : "Não foi possível entrar. Tente novamente.",
    );
  }
}

export const signIn = (email: string, password: string) =>
  sessionRequest("POST", { mode: "login", email, password });

export const signUp = (name: string, email: string, password: string) =>
  sessionRequest("POST", { mode: "register", name, email, password });

/** Sai da conta: apaga o cookie, limpa o cache e volta ao login. */
export function useSignOut() {
  const client = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    await sessionRequest("DELETE").catch(() => {});
    client.clear();
    router.replace("/login");
  }, [client, router]);
}
