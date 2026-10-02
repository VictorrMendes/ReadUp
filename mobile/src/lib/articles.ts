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
  book_id: number | null; // capítulo de um PDF do usuário; null = texto do feed
  book_title: string | null; // nome do livro do capítulo
};

// ponytail: sem paginação; limit 50 cobre o catálogo atual
export function listArticles(
  token: string,
  level?: Level,
  category?: string,
): Promise<ArticleSummary[]> {
  const params = new URLSearchParams({ limit: "50" });
  if (level) params.set("level", level);
  if (category) params.set("category", category);
  return apiFetch<ArticleSummary[]>(`/articles?${params}`, { token });
}

/** Níveis acima de `level`, do mais próximo ao mais distante. */
export function levelsAbove(level: Level): Level[] {
  return LEVELS.slice(LEVELS.indexOf(level) + 1);
}

/** Primeiro nível acima com textos (ex.: notícias só existem a partir do B1). null se nenhum. */
export async function nearestLevelAbove(
  token: string,
  level: Level,
  category?: string,
): Promise<{ level: Level; articles: ArticleSummary[] } | null> {
  for (const next of levelsAbove(level)) {
    const articles = await listArticles(token, next, category);
    if (articles.length > 0) return { level: next, articles };
  }
  return null;
}

export type ArticleDetail = ArticleSummary & {
  content: string;
  next_article_id: number | null; // próximo capítulo do mesmo livro
  source_url: string | null; // link original (notícias)
  attribution: string | null; // crédito da fonte (notícias); null para textos do app e PDFs
};

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

/**
 * "Próximo texto" / "Ler um texto": o primeiro não concluído da lista (já filtrada pelo nível),
 * fora o texto atual. Prefere um que a pessoa ainda não começou.
 */
export function pickNextText(
  articles: ArticleSummary[],
  excludeId?: number,
): ArticleSummary | undefined {
  const open = articles.filter((a) => !a.completed && a.id !== excludeId);
  return open.find((a) => a.progress === 0) ?? open[0];
}
