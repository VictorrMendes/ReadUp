import { AchievementIcon } from "@/components/achievement-icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { remainingLabel, type Achievement } from "@/lib/achievements";

export function NextAchievement({ achievement }: { achievement: Achievement }) {
  return (
    <section aria-label="Próxima conquista" className="flex items-center gap-4 rounded-card border border-gold-200 bg-gold-50 p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-gold-600 bg-gold-100 text-gold-700">
        <AchievementIcon name={achievement.icon} className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Próxima conquista</p>
        <p className="font-semibold">{achievement.title}</p>
        <div className="flex items-center gap-3">
          <ProgressBar value={achievement.current / achievement.target} size="thin" label={achievement.title} />
          <span className="shrink-0 text-xs font-semibold text-gold-700">{remainingLabel(achievement)}</span>
        </div>
      </div>
    </section>
  );
}
