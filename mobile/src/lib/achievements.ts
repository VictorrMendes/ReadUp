import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";

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

/**
 * "Próxima conquista": entre as bloqueadas, a mais perto de desbloquear (maior current/target);
 * empate fica com a que vem antes no catálogo. undefined quando todas já foram desbloqueadas.
 */
export function nextAchievement(achievements: Achievement[]): Achievement | undefined {
  let best: Achievement | undefined;
  for (const a of achievements) {
    if (a.unlocked) continue;
    if (!best || a.current / a.target > best.current / best.target) best = a;
  }
  return best;
}

// "faltam 2 textos" / "falta 1 texto" / "faltam 680 palavras"
export function remainingLabel(a: Pick<Achievement, "id" | "target" | "current">): string {
  const left = Math.max(0, a.target - a.current);
  const unit = achievementUnit(a.id, left);
  return `${left === 1 ? "falta" : "faltam"} ${formatNumber(left)} ${unit}`;
}
