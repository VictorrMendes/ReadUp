"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "./cn";

type Props = { open: boolean; onClose: () => void; label: string; children: ReactNode };

// Painel modal: sobe de baixo no celular e abre à direita no desktop (o texto continua visível).
// Fecha no fundo, no X e no Esc; o foco vai para o painel ao abrir e volta ao sair.
export function Sheet({ open, onClose, label, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  // quem chama costuma passar uma função nova a cada render: guardar em ref evita que o efeito
  // rode de novo e puxe o foco de volta para o painel a cada clique
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key === "Tab" && panel.current) trapTab(event, panel.current);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 lg:bg-ink/10"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink shadow-xl outline-none",
          "animate-[sheet-up_220ms_ease-out] lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[420px] lg:rounded-none lg:rounded-l-[28px] lg:animate-[sheet-left_220ms_ease-out]",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper"
        >
          <X className="size-5" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Mantém o Tab dentro do painel (o fundo fica coberto e não deve receber foco). */
function trapTab(event: KeyboardEvent, container: HTMLElement) {
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const inside = active instanceof Node && container.contains(active);
  if (event.shiftKey && (active === first || !inside || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !inside)) {
    event.preventDefault();
    first.focus();
  }
}
