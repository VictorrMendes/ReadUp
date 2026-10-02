"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flame, LogOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AchievementBadge } from "@/components/profile/achievement-badge";
import { WeekChart } from "@/components/profile/week-chart";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { OptionList } from "@/components/ui/option-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getAchievements } from "@/lib/achievements";
import { errorMessage } from "@/lib/api";
import { formatNumber, initials } from "@/lib/format";
import { ME_KEY, useMe, useSignOut } from "@/lib/session";
import { getDaily, getSummary } from "@/lib/stats";
import { GOAL_OPTIONS, LEVEL_OPTIONS, setGoal, setLevel } from "@/lib/user";

const SAVED_FEEDBACK_MS = 2000;

export default function ProfilePage() {
  const client = useQueryClient();
  const me = useMe();
  const signOut = useSignOut();
  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const daily = useQuery({ queryKey: ["daily", 7], queryFn: () => getDaily(7) });
  const achievements = useQuery({ queryKey: ["achievements"], queryFn: getAchievements });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  async function save(change: () => Promise<unknown>, keys: string[][]) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await change();
      await client.invalidateQueries({ queryKey: ME_KEY });
      keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }));
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e, "Não foi possível salvar. Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  const user = me.data;
  if (!user) return null;
  const s = summary.data;
  const unlocked = achievements.data?.filter((a) => a.unlocked).length ?? 0;

  return (
    <Page>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex items-center gap-4">
            <span
              aria-hidden
              className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-100 text-lg font-bold text-primary-600"
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{user.name}</h1>
              <p className="truncate text-ink-soft">{user.email}</p>
            </div>
          </Card>

          {summary.isError ? (
            <p className="text-sm text-ink-soft">Não foi possível carregar suas estatísticas.</p>
          ) : !s ? (
            <div className="flex flex-col gap-3" aria-label="Carregando estatísticas">
              <Skeleton className="h-48" />
              <Skeleton className="h-44" />
            </div>
          ) : (
            <section aria-label="Estatísticas" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                value={s.streak_current}
                label="dias de ofensiva"
                icon={<Flame className={cn("size-5", s.streak_active_today ? "fill-streak text-streak" : "text-ink-soft")} aria-hidden />}
              />
              <StatTile value={s.streak_longest} label="dias na maior ofensiva" />
              <StatTile value={s.xp_total} label="XP total" />
              <StatTile value={s.words_total} label="palavras lidas" />
              <StatTile value={s.minutes_total} label="minutos de leitura" />
              <StatTile value={s.texts_completed_total} label="textos concluídos" />
              <StatTile
                value={`${formatNumber(s.books_started)} / ${formatNumber(s.books_completed)}`}
                label="livros iniciados / concluídos"
              />
              <StatTile value={s.words_saved_total} label="palavras salvas" />
            </section>
          )}

          {daily.data && <WeekChart days={daily.data} />}

          {achievements.data && (
            <section aria-labelledby="achievements-title" className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 id="achievements-title" className="text-lg font-semibold">
                  Conquistas
                </h2>
                <p className="text-sm text-ink-soft">
                  {unlocked} de {achievements.data.length}
                </p>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {achievements.data.map((a) => (
                  <AchievementBadge key={a.id} achievement={a} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="flex min-h-6 items-center" aria-live="polite">
            {error && (
              <p role="alert" className="text-sm text-error-text">
                {error}
              </p>
            )}
            {saved && (
              <p className="flex items-center gap-1 text-sm">
                <CheckCircle2 className="size-4 text-success-600" aria-hidden /> Salvo
              </p>
            )}
          </div>
          <h2 className="text-lg font-semibold">Nível de inglês</h2>
          <OptionList
            options={LEVEL_OPTIONS}
            label="Nível de inglês"
            value={user.english_level}
            disabled={saving}
            onChange={(level) => void save(() => setLevel(level), [["articles"], ["continue"]])}
          />
          <h2 className="mt-2 text-lg font-semibold">Meta diária</h2>
          <OptionList
            options={GOAL_OPTIONS}
            label="Meta diária"
            value={user.daily_goal}
            disabled={saving}
            onChange={(target) => void save(() => setGoal(target), [["goal"], ["daily"], ["summary"]])}
          />
          <Button variant="ghost" className="mt-4 self-start lg:hidden" icon={<LogOut className="size-4" aria-hidden />} onClick={() => void signOut()}>
            Sair
          </Button>
        </aside>
      </div>
    </Page>
  );
}

function StatTile({ value, label, icon }: { value: number | string; label: string; icon?: ReactNode }) {
  const shown = typeof value === "number" ? formatNumber(value) : value;
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-2xl font-bold tabular-nums">
        {icon}
        {shown}
      </p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
