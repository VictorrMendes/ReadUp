import { CheckCircle2 } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { formatDays, formatNumber } from "@/lib/format";
import type { DailyStat } from "@/lib/stats";

const MAX_BAR = 96; // px
const EMPTY_BAR = 4; // dia sem leitura: traço mínimo, não some do eixo
const LETTER = new Intl.DateTimeFormat("pt-BR", { weekday: "narrow", timeZone: "UTC" });
const NAME = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });

export function barHeight(words: number, max: number): number {
  return words > 0 && max > 0 ? Math.max(EMPTY_BAR, Math.round((words / max) * MAX_BAR)) : EMPTY_BAR;
}

/** Palavras lidas por dia, do mais antigo para hoje. Meta cumprida: barra verde com check (não só cor). */
export function WeekChart({ days }: { days: DailyStat[] }) {
  const max = Math.max(0, ...days.map((d) => d.words_read));
  const total = days.reduce((sum, d) => sum + d.words_read, 0);
  const goalDays = days.filter((d) => d.goal_met).length;
  return (
    <section className="rounded-card border border-line bg-surface p-6" aria-labelledby="week-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="week-title" className="whitespace-nowrap text-lg font-semibold">
          Últimos {days.length} dias
        </h2>
        <p className="text-sm text-ink-soft">
          {formatNumber(total)} palavras · meta em {formatDays(goalDays)}
        </p>
      </div>
      <ol className="mt-5 flex gap-2">
        {days.map((d) => {
          const date = new Date(`${d.day}T00:00:00Z`);
          const label =
            `${NAME.format(date)}, ${formatNumber(d.words_read)} ${d.words_read === 1 ? "palavra" : "palavras"}` +
            (d.goal_met ? ", meta cumprida" : "");
          return (
            <li key={d.day} className="flex flex-1 flex-col items-center gap-1.5" aria-label={label}>
              <div className="flex w-full flex-col items-center justify-end gap-1" style={{ height: MAX_BAR + 18 }} aria-hidden>
                {d.goal_met && <CheckCircle2 className="size-3 text-success-600" />}
                <div
                  className={cn(
                    "w-[70%] max-w-8 rounded-t-md",
                    d.words_read === 0 ? "bg-line" : d.goal_met ? "bg-success-600" : "bg-primary-500",
                  )}
                  style={{ height: barHeight(d.words_read, max) }}
                  title={label}
                />
              </div>
              <span className="text-xs text-ink-soft" aria-hidden>
                {LETTER.format(date).toUpperCase()}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
