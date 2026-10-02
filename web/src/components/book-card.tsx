import { BookText } from "lucide-react";
import Link from "next/link";

import { ProgressBar } from "@/components/ui/progress-bar";
import { bookTitle, type Book } from "@/lib/books";
import { formatNumber } from "@/lib/format";

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/livro/${book.id}`}
      className="group flex min-w-0 gap-4 rounded-card border border-line bg-surface p-5 transition-shadow hover:shadow-md"
    >
      <div className="grid h-20 w-14 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-500">
        <BookText className="size-7" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="line-clamp-2 font-serif [overflow-wrap:anywhere] text-lg font-semibold leading-snug group-hover:text-primary-600">
          {bookTitle(book.title)}
        </h3>
        <p className="text-sm text-ink-soft">
          {book.chapter_count} {book.chapter_count === 1 ? "parte" : "partes"} ·{" "}
          {formatNumber(book.word_count)} palavras
        </p>
        <div className="flex items-center gap-3">
          <ProgressBar value={book.progress / 100} size="thin" label="Progresso do livro" />
          <span className="text-xs font-semibold text-ink-soft">{book.progress}%</span>
        </div>
      </div>
    </Link>
  );
}
