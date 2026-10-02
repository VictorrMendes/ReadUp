import type { GoalStatus } from "@/lib/user";
import { formatDays, formatNumber } from "@/lib/format";

const WORDS_PER_MINUTE = 200;

/** Frase do topo do Início. */
export function heroMessage(goal: GoalStatus | undefined): string | null {
  if (!goal || goal.target === null) return null;
  if (goal.completed) return "Meta de hoje cumprida. Bom trabalho!";
  if (goal.words_today === 0) return "Que tal um texto curto agora?";
  return `Faltam ${formatNumber(goal.remaining)} palavras para fechar a meta.`;
}

export function minutesLeft(remaining: number): number {
  return Math.ceil(remaining / WORDS_PER_MINUTE);
}

export function goalActionLabel(completed: boolean, hasInProgress: boolean): string {
  if (completed) return "Ler mais um";
  return hasInProgress ? "Continuar leitura" : "Ler um texto";
}

export function streakLine(current: number, longest: number, activeToday: boolean): string {
  if (current === 0 && longest > 0) return `Recomece hoje · recorde de ${formatDays(longest)} salvo`;
  return activeToday ? "de ofensiva · mantida hoje" : "de ofensiva · leia hoje para manter";
}
