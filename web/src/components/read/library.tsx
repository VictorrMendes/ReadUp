"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api";
import { checkPdf, listBooks, uploadBook } from "@/lib/books";
import { riseIn } from "@/lib/motion";

/** "Meus livros": PDFs da pessoa e a importação. */
export function Library() {
  const router = useRouter();
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const books = useQuery({ queryKey: ["books"], queryFn: listBooks });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    const problem = checkPdf(file);
    if (problem) return setImportError(problem);
    setImporting(true);
    setImportError(null);
    try {
      const book = await uploadBook(file);
      await client.invalidateQueries({ queryKey: ["books"] });
      router.push(`/livro/${book.id}`);
    } catch (e) {
      setImportError(errorMessage(e, "Não foi possível enviar o PDF. Tente novamente."));
    } finally {
      setImporting(false);
    }
  }

  const importButton = (
    <Button
      loading={importing}
      icon={<FileUp className="size-4" aria-hidden />}
      onClick={() => input.current?.click()}
    >
      {importing ? "Processando PDF…" : "Importar PDF"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => void onFile(e)} />
      {books.data && books.data.length > 0 && <div>{importButton}</div>}
      {importError && (
        <p role="alert" className="text-sm text-error-text">
          {importError}
        </p>
      )}
      {books.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : books.isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-error-text">{errorMessage(books.error, "Não foi possível carregar seus livros.")}</p>
          <Button onClick={() => void books.refetch()}>Tentar novamente</Button>
        </div>
      ) : books.data.length === 0 ? (
        <EmptyState
          title="Você ainda não possui livros"
          message="Importe um PDF com texto selecionável (até 20 MB). Ele fica só na sua conta."
          action={importButton}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {books.data.map((book, i) => (
            <div key={book.id} className="grid" style={riseIn(i)}>
              <BookCard book={book} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
