import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-600",
  secondary: "bg-surface text-ink border border-line hover:bg-paper",
  ghost: "bg-transparent text-primary-600 hover:bg-primary-50",
  destructive: "bg-error-text text-white hover:opacity-90",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold " +
  "transition-[background-color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
};

export function Button({
  variant = "primary",
  loading,
  icon,
  block,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], block && "w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/** Link com cara de botão (navegação). */
export function ButtonLink({
  variant = "primary",
  block,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; block?: boolean }) {
  return <Link className={cn(BASE, VARIANTS[variant], block && "w-full", className)} {...props} />;
}
