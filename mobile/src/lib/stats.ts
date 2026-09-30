import { apiFetch } from "@/lib/api";

export type StatsSummary = {
  xp_total: number;
  xp_today: number;
  words_today: number;
  words_total: number;
  texts_completed_total: number;
};

export function getSummary(token: string): Promise<StatsSummary> {
  return apiFetch<StatsSummary>("/stats/summary", { token });
}
