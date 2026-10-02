"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Page } from "@/components/shell/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api";
import { bookTitle, continueChapter, deleteBook, getBook } from "@/lib/books";
import { formatNumber } from "@/lib/format";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const bookId = Number(id);
  const router = useRouter();
  const client = useQueryClient();
  const book = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getBook(bookId),
    enabled: Number.isInteger(bookId) && bookId > 0,
  });
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteBook(bookId);
      await client.invalidateQueries({ queryKey: ["books"] });
      router.replace("/ler?secao=livros");
    } catch (e) {
      setDeleteError(errorMessage(e, "Não foi possível excluir o livro."));
      setDeleting(false);
    }
  }

  const back = (
    <Link href="/ler?secao=livros" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline">
      <ArrowLeft className="size-4" aria-hidden /> Meus livros
    </Link>
  );

  if (book.isError) {
    const notFound = book.error instanceof ApiError && book.error.status === 404;
    return (
      <Page>
        {back}
        <p className={notFound ? "text-ink" : "text-error-text"}>
          {notFound ? "Livro não encontrado" : errorMessage(book.error)}
        </p>
      </Page>
    );
  }
  if (!book.data) {
    return (
      <Page>
        {back}
        <Skeleton className="mb-4 h-10 w-2/3" />
        <Skeleton className="h-64" />
      </Page>
    );
  }

  const data = book.data;
  const next = continueChapter(data.chapters);
  return (
    <Page>
      {back}
      <h1 className="font-serif text-3xl font-semibold leading-tight [overflow-wrap:anywhere]">{bookTitle(data.title)}</h1>
      <p className="mt-2 text-ink-soft">
        {formatNumber(data.page_count)} páginas · {data.chapter_count}{" "}
        {data.chapter_count === 1 ? "parte" : "partes"} · {formatNumber(data.word_count)} palavras
      </p>
      <div className="mt-4 flex max-w-md items-center gap-3">
        <ProgressBar value={data.progress / 100} label="Progresso do livro" />
        <span className="text-sm font-semibold">{data.progress}%</span>
      </div>
      {next && (
        <ButtonLink href={`/texto/${next.id}`} className="mt-5">
          {data.progress > 0 ? "Continuar leitura" : "Começar a ler"}
        </ButtonLink>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Partes</h2>
      <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {data.chapters.map((chapter) => (
          <li key={chapter.id}>
            <Link href={`/texto/${chapter.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
              <span className="w-6 text-sm font-semibold text-ink-soft">{chapter.position}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{chapter.title}</span>
                <span className="text-sm text-ink-soft">
                  {chapter.estimated_minutes} min
                  {chapter.progress > 0 && !chapter.completed && ` · ${chapter.progress}%`}
                </span>
              </span>
              {chapter.completed && (
                <CheckCircle2 className="size-5 text-success-600" aria-label="Concluído" />
              )}
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col items-start gap-3">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-error/40 bg-surface p-4">
            <p className="text-sm">Excluir este livro e o progresso dele? Não dá para desfazer.</p>
            <Button variant="destructive" loading={deleting} onClick={() => void remove()}>
              Excluir
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="ghost" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirming(true)}>
            Excluir livro
          </Button>
        )}
        {deleteError && <p role="alert" className="text-sm text-error-text">{deleteError}</p>}
      </div>
    </Page>
  );
}
