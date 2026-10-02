"use client";

import { CheckCircle2 } from "lucide-react";

import type { Option } from "@/lib/user";

import { cn } from "./cn";

type Props<T> = {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
};

/** Escolha única como grupo de rádio; o selecionado tem borda, fundo e check (não só cor). */
export function OptionList<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
}: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
              selected
                ? "border-primary-500 bg-primary-50"
                : "border-line bg-surface hover:bg-paper",
              disabled && "opacity-60",
            )}
          >
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">{option.label}</span>
              <span className={cn("text-sm", selected ? "text-primary-700" : "text-ink-soft")}>
                {option.description}
              </span>
            </span>
            {selected && <CheckCircle2 className="size-6 text-primary-500" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
