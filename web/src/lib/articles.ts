import { apiFetch } from "@/lib/api";
import type { Level } from "@/lib/user";

export type ArticleSummary = {
  id: number;
  title: string;
  category: string;
  difficulty: Level | null;
  word_count: number;
  estimated_minutes: number;
  source: string;
  published_at: string | null;
  progress: number;
  completed: boolean;
  book_id: number | null; // capítulo de um PDF do usuário; null = texto do feed
  book_title: string | null; // nome do livro do capítulo
};

export type ArticleDetail = ArticleSummary & {
  content: string;
  next_article_id: number | null; // próximo capítulo do mesmo livro
  source_url: string | null; // link original (notícias)
  attribution: string | null; // crédito da fonte (notícias)
};

export const NEWS_CATEGORY = "Notícias";

export function listArticles(level?: Level | null, category?: string): Promise<ArticleSummary[]> {
  const params = new URLSearchParams({ limit: "50" });
  if (level) params.set("level", level);
  if (category) params.set("category", category);
  return apiFetch<ArticleSummary[]>(`/articles?${params}`);
}

export const getArticle = (id: number) => apiFetch<ArticleDetail>(`/articles/${id}`);

const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1"];

/** Níveis acima de `level`, do mais próximo ao mais distante. */
export function levelsAbove(level: Level): Level[] {
  return LEVEL_ORDER.slice(LEVEL_ORDER.indexOf(level) + 1);
}

/** Primeiro nível acima com textos (ex.: notícias só existem a partir do B1). null se nenhum. */
export async function nearestLevelAbove(
  level: Level,
  category?: string,
): Promise<{ level: Level; articles: ArticleSummary[] } | null> {
  for (const next of levelsAbove(level)) {
    const articles = await listArticles(next, category);
    if (articles.length > 0) return { level: next, articles };
  }
  return null;
}

export async function getContinueReading(): Promise<ArticleSummary | null> {
  const [latest] = await apiFetch<ArticleSummary[]>("/articles?in_progress=true&limit=1");
  return latest ?? null;
}

/** Próximo texto sugerido: o primeiro não concluído (prefere um não começado), fora o atual. */
export function pickNextText(articles: ArticleSummary[], excludeId?: number) {
  const open = articles.filter((a) => !a.completed && a.id !== excludeId);
  return open.find((a) => a.progress === 0) ?? open[0];
}
