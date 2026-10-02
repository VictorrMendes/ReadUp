"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";

import { cn } from "./cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null };

export function TextField({ label, error, type = "text", className, ...props }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={password && visible ? "text" : type}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "min-h-12 w-full rounded-xl border bg-surface px-4 text-base outline-none",
            "focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
            error ? "border-error" : "border-line-strong",
            password && "pr-12",
          )}
          {...props}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-soft"
          >
            {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-error-text">
          {error}
        </p>
      )}
    </div>
  );
}
