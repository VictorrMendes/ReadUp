import { apiFetch } from "@/lib/api";

// Fração lida (0–1) a partir da rolagem. Conteúdo que cabe na tela conta como lido por inteiro.
export function scrollProgress(offsetY: number, contentHeight: number, viewportHeight: number) {
  const scrollable = contentHeight - viewportHeight;
  if (scrollable <= 0) return 1;
  return Math.min(1, Math.max(0, offsetY / scrollable));
}

export type ProgressResult = {
  progress: number;
  words_read: number;
  words_credited: number;
  completed: boolean;
  xp_gained: number;
  goal_met: boolean;
};

export function saveProgress(
  token: string,
  body: { article_id: number; progress: number; seconds: number },
): Promise<ProgressResult> {
  return apiFetch<ProgressResult>("/reading/progress", { method: "POST", token, body });
}
