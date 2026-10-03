"use client";

import { useSyncExternalStore } from "react";

// "Esconder a ofensiva" (Perfil): preferência deste navegador (autonomia, plan.txt §4.5). Vale na
// hora em todas as telas e abas abertas; sem localStorage (modo privado), a ofensiva aparece.
const KEY = "readup.hide_streak";
const listeners = new Set<() => void>();
let fallback = false; // sem localStorage: a escolha vale até recarregar

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return fallback;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // outra aba mudou a preferência
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** true = a pessoa escondeu a ofensiva; null no servidor (ainda sem saber). */
export function useStreakHidden(): boolean | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function setStreakHidden(hidden: boolean) {
  try {
    localStorage.setItem(KEY, hidden ? "1" : "0");
  } catch {
    fallback = hidden;
  }
  listeners.forEach((listener) => listener());
}
