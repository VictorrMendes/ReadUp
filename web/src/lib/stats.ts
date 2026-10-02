import { apiFetch } from "@/lib/api";

export type StatsSummary = {
  xp_total: number;
  xp_today: number;
  words_today: number;
  words_total: number;
  texts_completed_total: number;
  streak_current: number;
  streak_longest: number;
  streak_active_today: boolean;
  minutes_total: number;
  words_saved_total: number;
  books_started: number;
  books_completed: number;
};

export type DailyStat = { day: string; words_read: number; xp: number; goal_met: boolean };

export const getSummary = () => apiFetch<StatsSummary>("/stats/summary");
export const getDaily = (days = 7) => apiFetch<DailyStat[]>(`/stats/daily?days=${days}`);
