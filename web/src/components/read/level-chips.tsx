"use client";

import { cn } from "@/components/ui/cn";
import { LEVELS, type Level } from "@/lib/user";

export function LevelChips({ value, onChange }: { value: Level | null; onChange: (level: Level | null) => void }) {
  const options: (Level | null)[] = [null, ...LEVELS];
  return (
    <div role="group" aria-label="Filtrar por nível" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option ?? "all"}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-10 min-w-11 rounded-2xl border px-4 text-sm font-semibold transition-colors",
              selected
                ? "border-primary-500 bg-primary-500 text-white"
                : "border-line bg-surface hover:bg-paper",
            )}
          >
            {option ?? "Todos"}
          </button>
        );
      })}
    </div>
  );
}
