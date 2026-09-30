import { apiFetch } from "@/lib/api";

// Conquista desbloqueada num envio de progresso (resposta de POST /reading/progress).
export type AchievementRef = { id: string; title: string; icon: string };

export type Achievement = AchievementRef & {
  description: string;
  target: number;
  current: number; // limitado ao alvo
  unlocked: boolean;
};

export function getAchievements(token: string): Promise<Achievement[]> {
  return apiFetch<Achievement[]>("/achievements", { token });
}

// unidade do progresso pelo tipo de conquista (o id é estável): "3.200 de 10.000 palavras"
export function achievementUnit(id: string, target: number): string {
  if (id.startsWith("words-")) return "palavras";
  if (id === "first-text" || id.startsWith("texts-")) return target === 1 ? "texto" : "textos";
  if (id.startsWith("goal-")) return target === 1 ? "dia com meta" : "dias com meta";
  return target === 1 ? "dia seguido" : "dias seguidos";
}
