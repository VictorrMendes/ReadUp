"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  /** fração inicial (0–1): o progresso de antes desta sessão */
  from?: number;
  to: number;
  size?: number;
  stroke?: number;
  /** classe de cor do arco (ex.: "text-primary-500"); o arco usa currentColor */
  colorClass?: string;
  delay?: number;
  children?: ReactNode;
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** Anel da meta: enche de `from` até `to` (600 ms, desacelerando). Decorativo (quem usa descreve). */
export function GoalRing({ from = 0, to, size = 64, stroke = 8, colorClass = "text-primary-500", delay = 0, children }: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // começa em `from` e, no quadro seguinte, vai a `to`: a transição do CSS faz o resto
  const [value, setValue] = useState(clamp(from));
  useEffect(() => {
    const id = requestAnimationFrame(() => setValue(clamp(to)));
    return () => cancelAnimationFrame(id);
  }, [to]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden data-testid="goal-ring">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value)}
          className={`${colorClass} transition-[stroke-dashoffset,color] duration-[600ms] ease-[var(--ease-enter)]`}
          style={{ transitionDelay: `${delay}ms` }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
