import { CheckCircle2, Lock } from "lucide-react";

import { AchievementIcon } from "@/components/achievement-icon";
import { cn } from "@/components/ui/cn";
import { achievementUnit, type Achievement } from "@/lib/achievements";
import { formatNumber } from "@/lib/format";

/** Medalha: desbloqueada em dourado com check; bloqueada com cadeado e progresso (não só cor). */
export function AchievementBadge({ achievement: a }: { achievement: Achievement }) {
  const label = a.unlocked
    ? `${a.title}, desbloqueada`
    : `${a.title}, bloqueada, ${formatNumber(a.current)} de ${formatNumber(a.target)} ${achievementUnit(a.id, a.target)}`;
  return (
    <li
      aria-label={label}
      title={a.description}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-4",
        a.unlocked ? "border-gold-200 bg-gold-50" : "border-line bg-paper",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-full border-2",
          a.unlocked ? "border-gold-600 bg-gold-100 text-gold-700" : "border-line bg-surface text-ink-soft",
        )}
      >
        <AchievementIcon name={a.icon} className="size-5" />
      </span>
      <span className="text-sm font-semibold" aria-hidden>
        {a.title}
      </span>
      <span className={cn("flex items-center gap-1 text-xs", a.unlocked ? "text-gold-700" : "text-ink-soft")} aria-hidden>
        {a.unlocked ? <CheckCircle2 className="size-3" /> : <Lock className="size-3" />}
        {a.unlocked ? "Desbloqueada" : `${formatNumber(a.current)} / ${formatNumber(a.target)}`}
      </span>
    </li>
  );
}
