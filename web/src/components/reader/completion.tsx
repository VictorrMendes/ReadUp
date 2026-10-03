"use client";

import { Check, Clock, Flame, Zap } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { AchievementIcon } from "@/components/achievement-icon";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { GoalRing } from "@/components/ui/goal-ring";
import { formatDays, formatNumber } from "@/lib/format";
import { durations, prefersReducedMotion } from "@/lib/motion";
import type { SessionGains } from "@/lib/reading-session";
import { useCountUp } from "@/lib/use-count-up";
import { useStreakHidden } from "@/lib/streak-visibility";
import type { GoalStatus } from "@/lib/user";

const PHRASES = ["Mais um texto lido!", "Mandou bem!", "Leitura concluída"];
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 66, 100, 365];

/** Título: marco quando a ofensiva subiu nesta leitura; senão uma das 3 frases. */
export function completionTitle(streak: number, streakUp: boolean, pick: number): string {
  if (streakUp && STREAK_MILESTONES.includes(streak)) return `${streak} dias seguidos!`;
  return PHRASES[Math.floor(pick * PHRASES.length) % PHRASES.length];
}

/** Frase dos marcos grandes (66 dias = tempo médio de um hábito se firmar, Lally et al. 2010). */
export function milestoneNote(streak: number): string | null {
  switch (streak) {
    case 7:
      return "Uma semana inteira lendo em inglês.";
    case 30:
      return "Um mês: ler já faz parte do seu dia.";
    case 66:
      return "66 dias: o tempo médio para um hábito se firmar.";
    case 100:
      return "100 dias de leitura. Poucos chegam aqui.";
    case 365:
      return "Um ano inteiro lendo. Que jornada!";
    default:
      return null;
  }
}

type Action = { label: string; onClick: () => void };

type Props = {
  articleTitle: string;
  minutes: number;
  gains: SessionGains;
  goal: GoalStatus | null;
  longestStreak: number | null;
  primary: Action | null;
  secondary: Action;
  onClose: () => void;
  // "Terminar por hoje" (com a meta cumprida): fim positivo em vez de "mais um" (pico-fim)
  onFinishForToday?: () => void;
};

const RING_DELAY = 300;

// Tela cheia de conclusão: entra em sequência curta (CSS; "reduzir movimento" desliga).
export function Completion({
  articleTitle,
  minutes,
  gains,
  goal,
  longestStreak,
  primary,
  secondary,
  onClose,
  onFinishForToday,
}: Props) {
  const [pick] = useState(() => Math.random());
  const heading = useRef<HTMLHeadingElement>(null);
  const [finished, setFinished] = useState(false);
  // ofensiva +1 nesta leitura (mínimo do dia), e a pessoa não a escondeu
  const streakHidden = useStreakHidden();
  const streakUp = gains.streakUp && streakHidden === false;
  // foco no título ao abrir e ao trocar para o "até amanhã"
  useEffect(() => heading.current?.focus(), [finished]);

  const title = completionTitle(gains.streak, streakUp, pick);
  const target = goal?.target ?? null;
  const fraction = target ? Math.min(1, (goal?.words_today ?? 0) / target) : 0;
  const before = target ? Math.min(1, Math.max(0, ((goal?.words_today ?? 0) - gains.words) / target)) : 0;
  // a meta vira nesta leitura: o anel fica verde, confete no instante em que passa de 100%
  const willCross = target !== null && before < 1 && fraction >= 1;
  const [ringFull, setRingFull] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  const crossed = (target !== null && before >= 1) || (willCross && (ringFull || reduced));
  const milestone = streakUp ? milestoneNote(gains.streak) : null;
  const xp = useCountUp(gains.xp, { delay: 300 });
  const words = useCountUp(gains.words, { delay: 360 });

  useEffect(() => {
    if (!willCross || reduced) return;
    const share = (1 - before) / Math.max(0.001, fraction - before);
    const id = setTimeout(() => setRingFull(true), RING_DELAY + durations.progress * share * 0.7);
    return () => clearTimeout(id);
  }, [willCross, reduced, before, fraction]);

  const step = (i: number) => ({ animation: `rise 280ms var(--ease-enter) ${i * 90}ms both` });

  if (finished && onFinishForToday) {
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="completion-title" className="fixed inset-0 z-50 overflow-y-auto bg-paper">
        <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-4 px-6 py-10 text-center" style={step(0)}>
          <Image src="/mascot.png" alt="" width={140} height={140} />
          <h1 id="completion-title" ref={heading} tabIndex={-1} className="text-3xl font-bold outline-none">
            Até amanhã!
          </h1>
          <p className="text-ink-soft">
            {goal?.completed && streakHidden === false
              ? `Meta cumprida e ofensiva de ${formatDays(gains.streak)} garantida. Descansar também faz parte.`
              : goal?.completed
                ? "Meta cumprida. Descansar também faz parte."
                : "Boa leitura hoje. Descansar também faz parte."}
          </p>
          <Button block className="mt-4" onClick={onFinishForToday}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="completion-title" className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div className="mx-auto flex min-h-full max-w-lg flex-col gap-5 px-6 py-10">
        <Image src="/mascot.png" alt="" width={140} height={140} className="mx-auto animate-[pop_420ms_ease-out_both]" />
        <div className="text-center" style={step(1)}>
          <h1 id="completion-title" ref={heading} tabIndex={-1} className="text-3xl font-bold outline-none">
            {title}
          </h1>
          <p className="mt-1 line-clamp-2 text-ink-soft">{articleTitle}</p>
        </div>
        <div className="grid grid-cols-3 gap-3" style={step(2)}>
          <Tile icon={<Zap className="size-5 text-gold-700" aria-hidden />} value={`+${formatNumber(xp)}`} ariaValue={`+${formatNumber(gains.xp)}`} label="XP" tone="bg-gold-50 border-gold-200" />
          <Tile icon={<span aria-hidden className="text-primary-600 font-bold">Aa</span>} value={formatNumber(words)} ariaValue={formatNumber(gains.words)} label="palavras" tone="bg-primary-50 border-primary-100" />
          <Tile icon={<Clock className="size-5 text-ink-soft" aria-hidden />} value={`${minutes} min`} label="de leitura" tone="bg-surface border-line" />
        </div>
        {target !== null && goal && (
          <div
            className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors duration-300 ${crossed ? "border-success-500 bg-success-100" : "border-line bg-surface"}`}
            style={step(3)}
            role="group"
            aria-label={
              goal.completed
                ? `Meta de hoje cumprida: ${formatNumber(goal.words_today)} de ${formatNumber(target)} palavras`
                : `Faltam ${formatNumber(goal.remaining)} palavras para a meta de hoje`
            }
          >
            <GoalRing
              from={before}
              to={fraction}
              delay={RING_DELAY}
              colorClass={crossed ? "text-success-500" : "text-primary-500"}
            >
              {crossed ? (
                <Check className="size-6 text-success-600" strokeWidth={3} />
              ) : (
                <span className="text-sm font-semibold tabular-nums">{Math.round(fraction * 100)}%</span>
              )}
            </GoalRing>
            <div className="text-sm font-semibold">
              <p>{crossed ? "Meta de hoje cumprida" : `Faltam ${formatNumber(goal.remaining)} palavras`}</p>
              <p className={`tabular-nums ${crossed ? "text-success-700" : "text-ink-soft"}`}>
                {formatNumber(goal.words_today)} / {formatNumber(target)}
              </p>
            </div>
          </div>
        )}
        {streakUp && (
          <div className="flex items-center gap-3 rounded-2xl border border-streak-100 bg-streak-50 p-4" style={step(4)}>
            <Flame className="size-8 shrink-0 fill-streak text-streak animate-[flame-pulse_1.2s_ease-in-out_700ms_both]" aria-hidden />
            <div>
              <p className="font-semibold">{formatDays(gains.streak)} de ofensiva</p>
              {longestStreak !== null && (
                <p className="text-sm text-streak-700">
                  {gains.streak >= longestStreak ? "Novo recorde!" : `faltam ${longestStreak - gains.streak} para o recorde`}
                </p>
              )}
              {milestone && <p className="mt-1 text-sm font-semibold">{milestone}</p>}
            </div>
          </div>
        )}
        {gains.achievements.map((a, i) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4" style={step(5 + i)}>
            <span className="grid size-11 place-items-center rounded-full border-2 border-gold-600 bg-gold-100 text-gold-700">
              <AchievementIcon name={a.icon} className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Conquista desbloqueada</p>
              <p className="font-semibold">{a.title}</p>
            </div>
          </div>
        ))}
        <div className="mt-auto flex flex-col gap-2 pt-4">
          {primary && <Button block onClick={primary.onClick}>{primary.label}</Button>}
          <Button block variant={primary ? "ghost" : "primary"} onClick={secondary.onClick}>
            {secondary.label}
          </Button>
          {onFinishForToday && goal?.completed && (
            <Button block variant="ghost" onClick={() => setFinished(true)}>
              Terminar por hoje
            </Button>
          )}
          <Button block variant="ghost" onClick={onClose}>
            Voltar ao texto
          </Button>
        </div>
      </div>
      {willCross && crossed && !reduced && <Confetti />}
    </div>
  );
}

function Tile({
  icon,
  value,
  ariaValue,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  ariaValue?: string; // valor final (o número animado não é lido passo a passo)
  label: string;
  tone: string;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border p-4 ${tone}`}>
      {icon}
      <span className="text-xl font-bold tabular-nums" aria-hidden={ariaValue ? true : undefined}>
        {value}
      </span>
      {ariaValue && <span className="sr-only">{ariaValue}</span>}
      <span className="text-xs text-ink-soft">{label}</span>
    </div>
  );
}
