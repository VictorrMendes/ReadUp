import { apiFetch } from "@/lib/api";

export type StatsSummary = {
  xp_total: number;
  xp_today: number;
  words_today: number;
  words_total: number;
  texts_completed_total: number;
  streak_current: number;
  streak_longest: number;
  streak_active_today: boolean; // mínimo do dia feito (50 palavras lidas)
  streak_freezes: number; // escudos restantes (0 com a ofensiva quebrada)
  minutes_total: number;
  words_saved_total: number;
  books_started: number;
  books_completed: number;
};

export type DailyStat = {
  day: string;
  words_read: number;
  xp: number;
  goal_met: boolean;
  streak_kept: boolean; // mínimo do dia feito
};

export const getSummary = () => apiFetch<StatsSummary>("/stats/summary");
export const getDaily = (days = 7) => apiFetch<DailyStat[]>(`/stats/daily?days=${days}`);
