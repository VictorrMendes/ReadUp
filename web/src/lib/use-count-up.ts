"use client";

import { useEffect, useState } from "react";

import { durations, prefersReducedMotion } from "./motion";

/**
 * Número subindo de 0 até `to` (ease-out, ~900 ms). Com "reduzir movimento" ou `skip`, já começa
 * no valor final. Quem exibe põe o valor final no aria-label (o leitor de tela não lê os passos).
 */
export function useCountUp(to: number, { delay = 0, skip = false } = {}): number {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? to : 0));

  useEffect(() => {
    if (skip || prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setShown(to));
      return () => cancelAnimationFrame(id);
    }
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / durations.count));
      setShown(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, delay, skip]);

  return shown;
}
