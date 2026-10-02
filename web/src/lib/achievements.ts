import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";

export type AchievementRef = { id: string; title: string; icon: string };

export type Achievement = AchievementRef & {
  description: string;
  target: number;
  current: number;
  unlocked: boolean;
};

export const getAchievements = () => apiFetch<Achievement[]>("/achievements");

export function achievementUnit(id: string, target: number): string {
  if (id.startsWith("words-")) return "palavras";
  if (id === "first-text" || id.startsWith("texts-")) return target === 1 ? "texto" : "textos";
  if (id.startsWith("goal-")) return target === 1 ? "dia com meta" : "dias com meta";
  return target === 1 ? "dia seguido" : "dias seguidos";
}

/** A bloqueada mais perto de desbloquear (empate: a que vem antes no catálogo). */
export function nextAchievement(achievements: Achievement[]): Achievement | undefined {
  let best: Achievement | undefined;
  for (const a of achievements) {
    if (a.unlocked) continue;
    if (!best || a.current / a.target > best.current / best.target) best = a;
  }
  return best;
}

export function remainingLabel(a: Pick<Achievement, "id" | "target" | "current">): string {
  const left = Math.max(0, a.target - a.current);
  return `${left === 1 ? "falta" : "faltam"} ${formatNumber(left)} ${achievementUnit(a.id, left)}`;
}
