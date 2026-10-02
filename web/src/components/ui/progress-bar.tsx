import { cn } from "./cn";

type Props = {
  value: number;
  tone?: "primary" | "success";
  size?: "thin" | "default" | "large";
  label?: string;
  // cores fixas (leitor: segue o tema claro/sépia/escuro escolhido)
  colors?: { track: string; fill: string };
};

export function ProgressBar({ value, tone = "primary", size = "default", label, colors }: Props) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className={cn(
        "w-full overflow-hidden rounded-full bg-line",
        size === "thin" ? "h-1" : size === "large" ? "h-3" : "h-2",
      )}
      style={colors && { background: colors.track }}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-[600ms] ease-[var(--ease-enter)]",
          tone === "success" ? "bg-success-500" : "bg-primary-500",
        )}
        style={{ width: `${percent}%`, ...(colors && { background: colors.fill }) }}
      />
    </div>
  );
}
