"use client";

import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import Image from "next/image";

import { DailyGoal } from "@/components/home/daily-goal";
import { NextAchievement } from "@/components/home/next-achievement";
import { StreakCard } from "@/components/home/streak-card";
import { ReadingCard } from "@/components/reading-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAchievements, nextAchievement } from "@/lib/achievements";
import { getContinueReading, listArticles, pickNextText } from "@/lib/articles";
import { formatLongDate, formatNumber } from "@/lib/format";
import { heroMessage } from "@/lib/home";
import { riseIn } from "@/lib/motion";
import { useMe } from "@/lib/session";
import { getDaily, getSummary } from "@/lib/stats";
import { useStreakHidden } from "@/lib/streak-visibility";
import { getGoal } from "@/lib/user";

export default function HomePage() {
  const { data: user } = useMe();
  const streakHidden = useStreakHidden();
  const level = user?.english_level ?? null;
  const goal = useQuery({ queryKey: ["goal"], queryFn: getGoal });
  const continueReading = useQuery({ queryKey: ["continue"], queryFn: getContinueReading });
  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const week = useQuery({ queryKey: ["daily", 7], queryFn: () => getDaily(7) });
  const achievements = useQuery({ queryKey: ["achievements"], queryFn: getAchievements });
  // sem texto em andamento: sugere o próximo do nível da pessoa
  const suggestions = useQuery({
    queryKey: ["articles", level, null],
    queryFn: () => listArticles(level),
    enabled: continueReading.isSuccess && continueReading.data === null,
  });

  const current = continueReading.data ?? null;
  const suggestion = suggestions.data ? pickNextText(suggestions.data) : undefined;
  const target = current ?? suggestion;
  const next = achievements.data ? nextAchievement(achievements.data) : undefined;
  const message = heroMessage(goal.data);

  // API fora do ar: sem isso a tela ficaria em carregamento para sempre
  if ([goal, continueReading, summary].some((q) => q.isError && !q.data)) {
    const retry = () => [goal, continueReading, summary, week, achievements].forEach((q) => void q.refetch());
    return (
      <main className="mx-auto grid min-h-[70dvh] w-full max-w-5xl place-items-center px-4">
        <div role="alert" className="flex flex-col items-center gap-3 text-center">
          <Image src="/mascot.png" alt="" width={120} height={120} />
          <p className="font-semibold">Não foi possível carregar o Início.</p>
          <p className="text-sm text-ink-soft">Verifique sua conexão e tente de novo.</p>
          <Button onClick={retry}>Tentar novamente</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl lg:px-10 lg:py-10">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#4846ae] to-primary-600 px-6 pb-20 pt-8 text-white lg:rounded-card lg:px-10 lg:pb-10">
        <Image
          src="/mascot.png"
          alt=""
          width={180}
          height={180}
          priority
          className="pointer-events-none absolute bottom-12 right-3 w-24 opacity-95 sm:w-32 lg:-bottom-4 lg:right-8 lg:w-44"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white/90">{formatLongDate(new Date())}</p>
          {summary.data && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold lg:mr-48">
              <Zap className="size-4 fill-gold-200 text-gold-200" aria-hidden />
              {formatNumber(summary.data.xp_total)} XP
            </span>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-bold">Olá, {user?.name}</h1>
        {message && <p className="mt-1 max-w-[60%] text-white/90">{message}</p>}
      </header>

      <div className="relative z-10 -mt-12 grid gap-5 px-4 sm:px-6 lg:mt-6 lg:grid-cols-[1.2fr_1fr] lg:px-0">
        <div className="flex flex-col gap-5">
          {goal.data?.target != null ? (
            // cartões entram em cascata quando os dados chegam
            <div style={riseIn(0)}>
              <DailyGoal
                goal={{ ...goal.data, target: goal.data.target }}
                // com texto em andamento, o "Continuar lendo" logo abaixo já é a ação
                actionHref={current ? null : suggestion ? `/texto/${suggestion.id}` : "/ler"}
                hasInProgress={!!current}
              />
            </div>
          ) : (
            <Skeleton className="h-60" />
          )}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{current ? "Continuar lendo" : "Sugerido para você"}</h2>
            {continueReading.isPending || (!current && suggestions.isPending) ? (
              <Skeleton className="h-36" />
            ) : target ? (
              <div className="grid" style={riseIn(1)}>
                <ReadingCard article={target} />
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5">
                <p className="text-ink-soft">Você já leu todos os textos do seu nível.</p>
                <ButtonLink href="/ler" variant="secondary">
                  Ver textos
                </ButtonLink>
              </div>
            )}
          </section>
        </div>
        <div className="flex flex-col gap-5">
          {streakHidden !== false ? null : summary.data ? (
            <div style={riseIn(1)}>
              <StreakCard
                current={summary.data.streak_current}
                longest={summary.data.streak_longest}
                activeToday={summary.data.streak_active_today}
                goalMetToday={goal.data?.completed}
                freezes={summary.data.streak_freezes}
                wordsTotal={summary.data.words_total}
                week={week.data}
              />
            </div>
          ) : (
            <Skeleton className="h-44" />
          )}
          {next && (
            <div style={riseIn(2)}>
              <NextAchievement achievement={next} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
