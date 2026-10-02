"use client";

import { useState, type CSSProperties } from "react";

// cores da celebração: marca, recompensa, ofensiva e meta (papéis do design system)
const PALETTE = ["bg-primary-500", "bg-gold-600", "bg-streak", "bg-success-500", "bg-primary-200"];
const COUNT = 36;

/**
 * Confete leve (CSS puro, ~36 peças) para eventos raros: meta batida e marcos de ofensiva. Não
 * recebe cliques e some em ~1,8 s; com "reduzir movimento" não aparece (globals.css).
 */
export function Confetti({ random = Math.random }: { random?: () => number }) {
  const [pieces] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      left: `${random() * 100}%`,
      x: `${(random() - 0.5) * 120}px`,
      r: `${(random() - 0.5) * 720}deg`,
      delay: random() * 250,
      duration: 1500 * (0.85 + random() * 0.35),
      color: PALETTE[i % PALETTE.length],
      w: 6 + random() * 4,
      h: 10 + random() * 6,
    })),
  );
  return (
    <div className="confetti pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden data-testid="confetti">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`absolute top-0 rounded-[2px] ${p.color}`}
          style={
            {
              left: p.left,
              width: p.w,
              height: p.h,
              "--x": p.x,
              "--r": p.r,
              animation: `confetti-fall ${p.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms both`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
