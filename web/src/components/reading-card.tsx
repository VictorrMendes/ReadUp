import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { ArticleSummary } from "@/lib/articles";
import { bookTitle } from "@/lib/books";
import { formatNumber } from "@/lib/format";

/** Cartão de texto do feed (ou capítulo): abre o leitor. */
export function ReadingCard({ article }: { article: ArticleSummary }) {
  const started = article.progress > 0 && !article.completed;
  return (
    <Link
      href={`/texto/${article.id}`}
      className="group flex flex-col gap-3 rounded-card border border-line bg-surface p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        {/* capítulo: o nome do livro diz mais que "Livro" */}
        <span className="min-w-0 truncate">{article.book_title ? bookTitle(article.book_title) : article.category}</span>
        {article.difficulty && <Badge tone="primary">{article.difficulty}</Badge>}
        {article.completed && (
          <Badge tone="success" icon={<CheckCircle2 className="size-3.5" aria-hidden />}>
            Concluído
          </Badge>
        )}
      </div>
      <h3 lang="en" className="[overflow-wrap:anywhere] font-serif text-lg font-semibold leading-snug group-hover:text-primary-600">
        {article.title}
      </h3>
      <p className="flex items-center gap-1.5 text-sm text-ink-soft">
        <Clock className="size-4" aria-hidden />
        {article.estimated_minutes} min · {formatNumber(article.word_count)} palavras
      </p>
      {started && (
        <div className="flex items-center gap-3">
          <ProgressBar value={article.progress / 100} size="thin" label="Progresso" />
          <span className="text-xs font-semibold text-ink-soft">{article.progress}%</span>
        </div>
      )}
    </Link>
  );
}
