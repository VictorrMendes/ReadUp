import { apiFetch } from "@/lib/api";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Level = (typeof LEVELS)[number];

export type ArticleSummary = {
  id: number;
  title: string;
  category: string;
  difficulty: Level | null;
  word_count: number;
  estimated_minutes: number;
  source: string;
  published_at: string | null;
  // progresso do usuário logado
  progress: number;
  completed: boolean;
};

// ponytail: sem paginação; limit 50 cobre o catálogo atual
export function listArticles(token: string, level?: Level): Promise<ArticleSummary[]> {
  const query = level ? `?limit=50&level=${level}` : "?limit=50";
  return apiFetch<ArticleSummary[]>(`/articles${query}`, { token });
}

export type ArticleDetail = ArticleSummary & { content: string };

export function getArticle(token: string, id: number): Promise<ArticleDetail> {
  return apiFetch<ArticleDetail>(`/articles/${id}`, { token });
}

// "Continuar lendo": o texto começado e não concluído mais recente (ou null)
export async function getContinueReading(token: string): Promise<ArticleSummary | null> {
  const [latest] = await apiFetch<ArticleSummary[]>("/articles?in_progress=true&limit=1", {
    token,
  });
  return latest ?? null;
}
