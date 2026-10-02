import type { ReactNode } from "react";

import { cn } from "./cn";

type Tone = "neutral" | "primary" | "success" | "gold";

const TONES: Record<Tone, string> = {
  neutral: "bg-paper border-line text-ink",
  primary: "bg-primary-100 border-primary-100 text-primary-700",
  success: "bg-success-100 border-success-100 text-success-700",
  gold: "bg-gold-50 border-gold-200 text-gold-700",
};

export function Badge({ children, tone = "neutral", icon }: { children: ReactNode; tone?: Tone; icon?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}
