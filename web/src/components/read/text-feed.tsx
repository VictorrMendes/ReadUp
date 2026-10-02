"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { LevelChips } from "@/components/read/level-chips";
import { ReadingCard } from "@/components/reading-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api";
import { listArticles, nearestLevelAbove } from "@/lib/articles";
import { riseIn } from "@/lib/motion";
import type { Level } from "@/lib/user";

/** Textos do feed com filtro de nível (começa no nível da pessoa). */
export function TextFeed({ initialLevel, category }: { initialLevel: Level | null; category?: string }) {
  const [level, setLevel] = useState<Level | null>(initialLevel);
  const articles = useQuery({
    queryKey: ["articles", level, category ?? null],
    queryFn: () => listArticles(level, category),
  });
  // nível sem nada (ex.: notícias no A1/A2): oferece o nível acima mais próximo que tenha textos
  const empty = articles.isSuccess && articles.data.length === 0 && level !== null;
  const fallback = useQuery({
    queryKey: ["articles-above", level, category ?? null],
    queryFn: () => nearestLevelAbove(level as Level, category),
    enabled: empty,
  });

  return (
    <div className="flex flex-col gap-5">
      <LevelChips value={level} onChange={setLevel} />
      {articles.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : articles.isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-error-text">{errorMessage(articles.error, "Não foi possível carregar os textos.")}</p>
          <Button onClick={() => void articles.refetch()}>Tentar novamente</Button>
        </div>
      ) : articles.data.length === 0 && fallback.data ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            {category ? `Ainda não há ${category.toLowerCase()} no nível ${level}.` : `Ainda não há textos no nível ${level}.`}{" "}
            Estas são do nível {fallback.data.level}, um pouco mais difíceis: toque nas palavras para traduzir.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fallback.data.articles.map((article, i) => (
              <div key={article.id} className="grid" style={riseIn(i)}>
                <ReadingCard article={article} />
              </div>
            ))}
          </div>
        </div>
      ) : articles.data.length === 0 && empty && fallback.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : articles.data.length === 0 ? (
        <EmptyState
          title={category ? `Nada em ${category} para este nível` : "Nenhum texto para este nível ainda"}
          message="Escolha outro nível ou volte mais tarde."
          action={
            level ? (
              <Button variant="secondary" onClick={() => setLevel(null)}>
                Ver todos os níveis
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {articles.data.map((article, i) => (
            <div key={article.id} className="grid" style={riseIn(i)}>
              <ReadingCard article={article} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
