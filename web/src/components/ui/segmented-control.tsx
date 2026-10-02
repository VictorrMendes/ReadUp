"use client";

import { cn } from "./cn";

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

/** Seletor de seção (abas). Selecionado: fundo branco e texto índigo em negrito. */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-2xl bg-muted p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-10 flex-auto whitespace-nowrap rounded-xl px-2 text-sm font-semibold transition-colors sm:px-4",
              selected ? "border border-line bg-surface text-primary-700" : "text-ink-soft hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
