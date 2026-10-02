"use client";

import { Check } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import {
  FONT_SIZES,
  READER_THEMES,
  type ReaderFont,
  type ReaderSettings,
  type ReaderThemeName,
} from "@/lib/reader-settings";

const FONTS = [
  { value: "serif", label: "Serifa" },
  { value: "sans", label: "Sem serifa" },
] as const satisfies readonly { value: ReaderFont; label: string }[];

type Props = {
  open: boolean;
  settings: ReaderSettings;
  onChange: (change: Partial<ReaderSettings>) => void;
  onClose: () => void;
};

/** Painel "Aa": tamanho do texto, fonte e tema. Cada mudança vale na hora. */
export function SettingsPanel({ open, settings, onChange, onClose }: Props) {
  const size = FONT_SIZES[settings.sizeIndex];
  return (
    <Sheet open={open} onClose={onClose} label="Aparência do texto">
      <div className="flex flex-col gap-7">
        <h2 className="text-lg font-semibold">Aparência do texto</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-soft">Tamanho</span>
          <div className="flex items-center gap-3">
            <StepButton label="Diminuir texto" glyph="text-[15px]" disabled={settings.sizeIndex === 0} onClick={() => onChange({ sizeIndex: settings.sizeIndex - 1 })} />
            <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite" aria-label={`Tamanho do texto: ${size}`}>
              {size}
            </span>
            <StepButton label="Aumentar texto" glyph="text-[22px]" disabled={settings.sizeIndex === FONT_SIZES.length - 1} onClick={() => onChange({ sizeIndex: settings.sizeIndex + 1 })} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-soft">Fonte</span>
          <SegmentedControl options={FONTS} value={settings.font} onChange={(font) => onChange({ font })} label="Fonte" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-soft">Tema</span>
          <div role="radiogroup" aria-label="Tema" className="flex gap-5">
            {(Object.keys(READER_THEMES) as ReaderThemeName[]).map((name) => {
              const theme = READER_THEMES[name];
              const selected = settings.theme === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={theme.label}
                  onClick={() => onChange({ theme: name })}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "relative grid size-14 place-items-center rounded-full border font-serif text-lg font-semibold",
                      selected && "border-2 border-primary-500",
                    )}
                    style={{ background: theme.background, color: theme.text, borderColor: selected ? undefined : theme.border }}
                  >
                    Aa
                    {selected && (
                      <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-primary-500 text-white">
                        <Check className="size-3" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className={cn("text-sm", selected ? "text-primary-700" : "text-ink-soft")}>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function StepButton({ label, glyph, disabled, onClick }: { label: string; glyph: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("grid size-11 place-items-center rounded-xl border border-line bg-surface font-serif font-semibold hover:bg-paper disabled:opacity-40", glyph)}
    >
      A
    </button>
  );
}
