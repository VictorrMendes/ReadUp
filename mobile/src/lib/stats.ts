import { apiFetch } from "@/lib/api";

export type StatsSummary = {
  xp_total: number;
  xp_today: number;
  words_today: number;
  words_total: number;
  texts_completed_total: number;
  streak_current: number; // efetiva: 0 se quebrou
  streak_longest: number;
  streak_active_today: boolean; // mínimo do dia feito (50 palavras lidas)
  streak_freezes: number; // escudos restantes (0 com a ofensiva quebrada)
  minutes_total: number;
  words_saved_total: number;
  books_started: number;
  books_completed: number;
};

export function getSummary(token: string): Promise<StatsSummary> {
  return apiFetch<StatsSummary>("/stats/summary", { token });
}

export type DailyStat = {
  day: string;
  words_read: number;
  xp: number;
  goal_met: boolean;
  streak_kept: boolean; // mínimo do dia feito
};

// últimos `days` dias locais, do mais antigo para hoje (dias sem leitura vêm zerados)
export function getDaily(token: string, days = 7): Promise<DailyStat[]> {
  return apiFetch<DailyStat[]>(`/stats/daily?days=${days}`, { token });
}
