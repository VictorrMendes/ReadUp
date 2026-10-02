import type { CSSProperties } from "react";

// Mesma linguagem de movimento do mobile (src/lib/motion.ts lá). Curvas em globals.css (:root).

export const durations = {
  press: 100,
  select: 160,
  enter: 280,
  progress: 600,
  count: 900,
  celebrate: 1500,
} as const;

const STAGGER_MS = 45;
const STAGGER_MAX = 6;

/** Entrada em cascata (sobe e aparece). Só a primeira tela espera; o resto entra junto. */
export function riseIn(index = 0): CSSProperties {
  return {
    animation: `rise ${durations.enter}ms var(--ease-enter) ${Math.min(index, STAGGER_MAX) * STAGGER_MS}ms both`,
  };
}

/** true quando o sistema pede menos movimento (SSR: false). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
