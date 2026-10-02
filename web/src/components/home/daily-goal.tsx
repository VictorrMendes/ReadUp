import { CheckCircle2, Clock } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatNumber } from "@/lib/format";
import { goalActionLabel, minutesLeft } from "@/lib/home";
import type { GoalStatus } from "@/lib/user";

// actionHref null: o "Continuar lendo" logo abaixo já é a ação (evita dois botões para o mesmo texto)
type Props = { goal: GoalStatus & { target: number }; actionHref: string | null; hasInProgress: boolean };

export function DailyGoal({ goal, actionHref, hasInProgress }: Props) {
  const percent = Math.min(100, Math.floor((goal.words_today / goal.target) * 100));
  return (
    <section
      aria-label="Meta de hoje"
      className={`rounded-card border p-6 shadow-[0_4px_12px_rgba(28,25,23,0.08)] ${goal.completed ? "border-success-100 bg-success-100/40" : "border-transparent bg-surface"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Meta de hoje</p>
        <p className="text-sm font-semibold text-primary-600">{percent}%</p>
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-5xl font-bold tabular-nums tracking-tight">{formatNumber(goal.words_today)}</span>
        <span className="text-ink-soft">/ {formatNumber(goal.target)} palavras</span>
      </p>
      <div className="mt-4">
        <ProgressBar value={percent / 100} size="large" tone={goal.completed ? "success" : "primary"} label="Meta de hoje" />
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm">
        {goal.completed ? (
          <>
            <CheckCircle2 className="size-4 text-success-600" aria-hidden />
            <span className="font-semibold">Meta cumprida!</span>
          </>
        ) : (
          <>
            <Clock className="size-4 text-ink-soft" aria-hidden />≈ {minutesLeft(goal.remaining)} min de leitura para fechar
          </>
        )}
      </p>
      {actionHref && (
        <ButtonLink
          href={actionHref}
          variant={goal.completed ? "secondary" : "primary"}
          block
          className="mt-5 min-h-13"
        >
          {goalActionLabel(goal.completed, hasInProgress)}
        </ButtonLink>
      )}
    </section>
  );
}
