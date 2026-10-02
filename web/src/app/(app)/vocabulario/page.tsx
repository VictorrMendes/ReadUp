"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Page } from "@/components/shell/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { riseIn } from "@/lib/motion";
import { deleteWord, getReviewQueue, listWords, type SavedWord } from "@/lib/vocabulary";

export default function VocabularyPage() {
  const client = useQueryClient();
  const words = useQuery({ queryKey: ["words"], queryFn: listWords });
  // falha da fila só esconde o cartão de revisão
  const review = useQuery({ queryKey: ["review"], queryFn: getReviewQueue, retry: false });
  const [filter, setFilter] = useState("");
  const [confirming, setConfirming] = useState<number | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteWord(id),
    onSuccess: (_, id) => {
      client.setQueryData<SavedWord[]>(["words"], (list) => list?.filter((w) => w.id !== id));
      setConfirming(null);
      void client.invalidateQueries({ queryKey: ["review"] });
      void client.invalidateQueries({ queryKey: ["lookup"] });
      void client.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const shown = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!words.data || !term) return words.data ?? [];
    return words.data.filter(
      (w) => w.word.toLowerCase().includes(term) || (w.translation ?? "").toLowerCase().includes(term),
    );
  }, [words.data, filter]);

  const queue = review.data;
  const toReview = queue?.cards.length ?? 0;

  return (
    <Page title="Vocabulário">
      {words.isError ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-error-text">{errorMessage(words.error, "Não foi possível carregar suas palavras.")}</p>
          <Button onClick={() => void words.refetch()}>Tentar novamente</Button>
        </div>
      ) : !words.data ? (
        <div className="flex flex-col gap-3" aria-label="Carregando palavras">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : words.data.length === 0 ? (
        <EmptyState
          title="Nenhuma palavra salva ainda"
          message="Clique numa palavra durante a leitura para salvá-la aqui."
          action={<ButtonLink href="/ler">Ver textos</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {queue && (
            <section
              aria-label="Revisão de hoje"
              className="flex flex-col gap-3 rounded-card border border-primary-100 bg-primary-50 p-6 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-700">Revisão de hoje</p>
                <p className="mt-1">
                  {toReview > 0
                    ? `${formatNumber(toReview)} ${toReview === 1 ? "palavra" : "palavras"} a revisar`
                    : queue.reviewed_today >= queue.daily_limit
                      ? `Você já revisou ${queue.daily_limit} palavras hoje. Volte amanhã!`
                      : "Nada para revisar agora. Palavras salvas entram na revisão no dia seguinte."}
                </p>
              </div>
              {toReview > 0 && (
                <ButtonLink href="/revisao" className="shrink-0">
                  <Layers className="size-4" aria-hidden /> Revisar ({formatNumber(toReview)})
                </ButtonLink>
              )}
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              {formatNumber(words.data.length)} {words.data.length === 1 ? "palavra salva" : "palavras salvas"}
            </p>
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Buscar palavra</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar palavra ou tradução"
                className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 outline-none focus:border-primary-500"
              />
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="py-8 text-center text-ink-soft">Nenhuma palavra encontrada.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {shown.map((item, i) => (
                <li key={item.id} style={riseIn(i)}>
                  <Card className="flex h-full items-start gap-3 p-5">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p lang="en" className="font-serif text-xl font-semibold">
                        {item.word}
                      </p>
                      {item.translation ? <p>{item.translation}</p> : <p className="text-ink-soft">Sem tradução</p>}
                      {item.context && <p className="line-clamp-2 text-sm text-ink-soft">{item.context}</p>}
                      {item.article_title && <p className="truncate text-xs text-ink-soft">{item.article_title}</p>}
                      {confirming === item.id && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm">Remover do vocabulário?</span>
                          <Button
                            variant="destructive"
                            className="min-h-9 px-3 text-sm"
                            loading={remove.isPending}
                            onClick={() => remove.mutate(item.id)}
                          >
                            Remover
                          </Button>
                          <Button variant="ghost" className="min-h-9 px-3 text-sm" onClick={() => setConfirming(null)}>
                            Cancelar
                          </Button>
                          {remove.isError && (
                            <p role="alert" className="w-full text-sm text-error-text">
                              Não foi possível remover a palavra. Tente novamente.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${item.word}`}
                      onClick={() => {
                        remove.reset();
                        setConfirming(item.id);
                      }}
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Page>
  );
}
