import type { AchievementRef } from "@/lib/achievements";
import { apiFetch } from "@/lib/api";

// Fração lida (0–1) a partir da rolagem. Conteúdo que cabe na tela conta como lido por inteiro.
export function scrollProgress(offsetY: number, contentHeight: number, viewportHeight: number) {
  const scrollable = contentHeight - viewportHeight;
  if (scrollable <= 0) return 1;
  return Math.min(1, Math.max(0, offsetY / scrollable));
}

export type ProgressResult = {
  progress: number;
  words_read: number;
  words_credited: number;
  completed: boolean;
  xp_gained: number;
  goal_met: boolean;
  streak: number;
  streak_active_today: boolean; // mínimo do dia feito: a ofensiva contou hoje
  achievements_unlocked: AchievementRef[]; // desbloqueadas neste envio
};

// teto de crédito do servidor (app/reading/rules.py): 10 palavras por segundo de leitura
export const MAX_WORDS_PER_SECOND = 10;

/** Segundos de leitura que ainda faltam para o servidor creditar o texto inteiro. */
export function secondsToComplete(wordCount: number, wordsRead: number): number {
  return Math.max(1, Math.ceil(Math.max(0, wordCount - wordsRead) / MAX_WORDS_PER_SECOND));
}

// resultado do último toque em "Concluir leitura" (null = ainda não tocou)
export type FinishAttempt =
  | { kind: "too-fast"; wordCount: number; wordsRead: number }
  | { kind: "error" }
  | null;

export type EndState =
  | { kind: "done" } // já concluído: "Você já concluiu este texto" + ações
  | { kind: "ready" } // botão "Concluir leitura"
  | { kind: "too-fast"; seconds: number } // botão + "leia com calma: faltam ~N s"
  | { kind: "error" }; // botão + "Não foi possível confirmar agora"

/** O que mostrar no fim do texto. `done`: concluído ao abrir ou pelo toque nesta sessão. */
export function endState(done: boolean, attempt: FinishAttempt): EndState {
  if (done) return { kind: "done" };
  if (attempt?.kind === "too-fast")
    return { kind: "too-fast", seconds: secondsToComplete(attempt.wordCount, attempt.wordsRead) };
  if (attempt?.kind === "error") return { kind: "error" };
  return { kind: "ready" };
}

export function saveProgress(
  token: string,
  body: { article_id: number; progress: number; seconds: number },
): Promise<ProgressResult> {
  return apiFetch<ProgressResult>("/reading/progress", { method: "POST", token, body });
}
