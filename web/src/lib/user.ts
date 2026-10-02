import { apiFetch } from "@/lib/api";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Level = (typeof LEVELS)[number];

export type User = {
  id: number;
  name: string;
  email: string;
  english_level: Level | null;
  created_at: string;
  daily_goal: number | null;
};

export type Option<T> = { value: T; label: string; description: string };

// CEFR aproximada na V1 (mesmos textos do app)
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
  label: `${words.toLocaleString("pt-BR")} palavras`,
  description: `~${Math.ceil(words / WORDS_PER_MINUTE)} min por dia`,
}));

export type GoalStatus = {
  target: number | null;
  words_today: number;
  remaining: number;
  completed: boolean;
};

export const getMe = () => apiFetch<User>("/users/me");
export const setLevel = (level: Level) =>
  apiFetch<User>("/users/me", { method: "PATCH", body: { english_level: level } });
export const getGoal = () => apiFetch<GoalStatus>("/goals");
export const setGoal = (target: number) =>
  apiFetch<GoalStatus>("/goals", { method: "PUT", body: { target } });

/** Nível e meta escolhidos: sem eles, o app manda para o onboarding. */
export function isOnboarded(user: User): boolean {
  return !!user.english_level && user.daily_goal !== null;
}
