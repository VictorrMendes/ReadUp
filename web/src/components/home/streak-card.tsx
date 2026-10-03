import { Check, Flame, ShieldCheck } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { formatDays, formatNumber } from "@/lib/format";
import { freezesLabel, streakLine } from "@/lib/home";
import type { DailyStat } from "@/lib/stats";

const WEEKDAY = new Intl.DateTimeFormat("pt-BR", { weekday: "narrow", timeZone: "UTC" });

type Props = {
  current: number;
  longest: number;
  activeToday: boolean; // mínimo do dia feito
  goalMetToday?: boolean; // meta batida: chama dourada
  freezes?: number; // escudos restantes
  wordsTotal?: number; // acumulado: em destaque quando a ofensiva quebrou
  week?: DailyStat[];
};

export function StreakCard({ current, longest, activeToday, goalMetToday = false, freezes, wordsTotal, week }: Props) {
  const caption = streakLine(current, longest, activeToday, goalMetToday);
  const broken = current === 0 && longest > 0;
  const showFreezes = freezes !== undefined && current > 0;
  return (
    <section aria-label="Ofensiva" className="rounded-card border border-streak-100 bg-streak-50 p-6">
      <div className="flex items-center gap-4">
        {/* meta batida hoje: a chama ganha o halo dourado */}
        <span
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-full border-2",
            goalMetToday ? "border-gold-600 bg-gold-100" : "border-transparent",
          )}
          data-testid={goalMetToday ? "gold-flame" : undefined}
        >
          <Flame
            className={cn(
              "size-10",
              current > 0 ? "fill-streak text-streak" : "text-ink-soft",
              // ofensiva mantida hoje: dois pulsos ao aparecer
              activeToday && current > 0 && "animate-[flame-pulse_1.2s_ease-in-out_300ms_both]",
            )}
            aria-hidden
          />
        </span>
        <div>
          <p className="text-2xl font-bold">{formatDays(current)}</p>
          <p className="text-sm text-streak-700">{caption}</p>
          {showFreezes && (
            <p className="mt-1 flex items-center gap-1 text-xs text-streak-700">
              <ShieldCheck className="size-3.5" aria-hidden />
              {freezesLabel(freezes)}
            </p>
          )}
        </div>
      </div>
      {broken && wordsTotal ? (
        // ofensiva quebrada: o que nunca zera em destaque (autocompaixão, plan.txt §4.5)
        <p className="mt-4">
          Você já leu <strong className="tabular-nums">{formatNumber(wordsTotal)}</strong> palavras.
        </p>
      ) : null}
      {week && <WeekStrip week={week} />}
    </section>
  );
}

// Laranja = dia com leitura (ofensiva); verde = meta batida também. Estado nunca só pela cor:
// dia mantido tem check, hoje pendente é tracejado, dia sem leitura é vazio.
function WeekStrip({ week }: { week: DailyStat[] }) {
  const today = week[week.length - 1];
  const kept = week.filter((d) => d.streak_kept).length;
  const met = week.filter((d) => d.goal_met).length;
  return (
    <div
      role="img"
      className="mt-5 grid grid-cols-7 gap-1"
      aria-label={`Últimos ${week.length} dias: leu em ${kept}, meta batida em ${met}; hoje ${today?.streak_kept ? "mantida" : "pendente"}`}
    >
      {week.map((day, i) => {
        const isToday = i === week.length - 1;
        const label = WEEKDAY.format(new Date(`${day.day}T00:00:00Z`)).toUpperCase();
        const state = day.goal_met ? "met" : day.streak_kept ? "kept" : isToday ? "pending" : "missed";
        return (
          <div key={day.day} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-xs", isToday ? "font-bold text-primary-600" : "text-ink-soft")}>{label}</span>
            <span
              data-state={state}
              className={cn(
                "grid size-9 place-items-center rounded-full",
                state === "met" && "bg-success-600 text-white",
                // streak-700: check branco 5.2:1 (o laranja puro daria 2.8:1)
                state === "kept" && "bg-streak-700 text-white",
                state === "pending" && "border-2 border-dashed border-primary-500",
                state === "missed" && "bg-muted",
              )}
            >
              {(state === "met" || state === "kept") && <Check className="size-4" aria-hidden />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
