import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

// "Esconder a ofensiva" (Perfil): preferência só deste aparelho (autonomia, plan.txt §4.5).
// Um valor em memória compartilhado: trocar no Perfil já vale no Início e na conclusão.
const KEY = "readup.hide_streak";

let hidden: boolean | null = null; // null = ainda não lido do aparelho
let reading = false;
const listeners = new Set<() => void>();

function publish(value: boolean) {
  hidden = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (hidden === null && !reading) {
    reading = true;
    Promise.resolve(SecureStore.getItemAsync(KEY))
      .then((stored) => publish(stored === "1"))
      .catch(() => publish(false)); // sem leitura: mostra (o padrão)
  }
  return () => {
    listeners.delete(listener);
  };
}

/** true = a pessoa escondeu a ofensiva; null enquanto lê do aparelho. */
export function useStreakHidden(): boolean | null {
  return useSyncExternalStore(subscribe, () => hidden);
}

export async function setStreakHidden(value: boolean): Promise<void> {
  publish(value);
  await SecureStore.setItemAsync(KEY, value ? "1" : "0");
}
