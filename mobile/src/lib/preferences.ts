import { apiFetch } from "@/lib/api";
import type { Level } from "@/lib/articles";
import type { User } from "@/lib/auth";
import { formatNumber } from "@/lib/format";

export type Option<T> = { value: T; label: string; description: string };

// CEFR aproximada na V1
export const LEVEL_OPTIONS: Option<Level>[] = [
  { value: "A1", label: "A1", description: "Iniciante — frases simples do dia a dia" },
  { value: "A2", label: "A2", description: "Básico — textos curtos sobre temas conhecidos" },
  { value: "B1", label: "B1", description: "Intermediário — entende a ideia principal de textos" },
  { value: "B2", label: "B2", description: "Intermediário avançado — lê artigos com fluência" },
  { value: "C1", label: "C1", description: "Avançado — textos longos e complexos" },
];

const WORDS_PER_MINUTE = 200;

export const GOAL_OPTIONS: Option<number>[] = [300, 500, 1000, 2000].map((words) => ({
  value: words,
  label: `${formatNumber(words)} palavras`,
  description: `~${Math.ceil(words / WORDS_PER_MINUTE)} min por dia`,
}));

export type GoalStatus = {
  target: number | null;
  words_today: number;
  remaining: number;
  completed: boolean;
};

export function getGoal(token: string): Promise<GoalStatus> {
  return apiFetch<GoalStatus>("/goals", { token });
}

export function setGoal(token: string, target: number): Promise<GoalStatus> {
  return apiFetch<GoalStatus>("/goals", { method: "PUT", token, body: { target } });
}

export function setLevel(token: string, level: Level): Promise<User> {
  return apiFetch<User>("/users/me", { method: "PATCH", token, body: { english_level: level } });
}
