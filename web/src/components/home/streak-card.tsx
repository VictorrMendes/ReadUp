import { Check, Flame } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { formatDays } from "@/lib/format";
import { streakLine } from "@/lib/home";
import type { DailyStat } from "@/lib/stats";

const WEEKDAY = new Intl.DateTimeFormat("pt-BR", { weekday: "narrow", timeZone: "UTC" });

type Props = { current: number; longest: number; activeToday: boolean; week?: DailyStat[] };

export function StreakCard({ current, longest, activeToday, week }: Props) {
  return (
    <section aria-label="Ofensiva" className="rounded-card border border-streak-100 bg-streak-50 p-6">
      <div className="flex items-center gap-4">
        <Flame
          className={cn(
            "size-10 shrink-0",
            current > 0 ? "fill-streak text-streak" : "text-ink-soft",
            // ofensiva mantida hoje: dois pulsos ao aparecer
            activeToday && current > 0 && "animate-[flame-pulse_1.2s_ease-in-out_300ms_both]",
          )}
          aria-hidden
        />
        <div>
          <p className="text-2xl font-bold">{formatDays(current)}</p>
          <p className="text-sm text-streak-700">{streakLine(current, longest, activeToday)}</p>
        </div>
      </div>
      {week && (
        <ol className="mt-5 grid grid-cols-7 gap-1" aria-label="Últimos 7 dias">
          {week.map((day, i) => {
            const today = i === week.length - 1;
            const label = WEEKDAY.format(new Date(`${day.day}T00:00:00Z`)).toUpperCase();
            return (
              <li key={day.day} className="flex flex-col items-center gap-1.5">
                <span className={cn("text-xs", today ? "font-bold text-primary-600" : "text-ink-soft")}>
                  {label}
                </span>
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full",
                    day.goal_met
                      ? "bg-success-600 text-white"
                      : today
                        ? "border-2 border-dashed border-primary-500"
                        : "bg-muted",
                  )}
                  aria-label={`${day.day}: ${day.goal_met ? "meta cumprida" : "sem meta"}`}
                >
                  {day.goal_met && <Check className="size-4" aria-hidden />}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
