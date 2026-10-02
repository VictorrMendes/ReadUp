"use client";

import { Languages } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";

const MAX_SELECTION = 300; // limite do backend

/** Texto selecionado dentro do artigo, normalizado (ou null se não houver/for fora). */
export function selectedText(container: HTMLElement | null): string | null {
  const selection = window.getSelection();
  if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;
  const text = selection.toString().replace(/\s+/g, " ").trim();
  return /[A-Za-z]/.test(text) ? text : null;
}

/** Barra flutuante que aparece ao selecionar um trecho do texto: "Traduzir trecho". */
export function SelectionBar({ container, onTranslate }: { container: RefObject<HTMLElement | null>; onTranslate: (text: string) => void }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setText(selectedText(container.current));
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [container]);

  if (!text) return null;
  const tooLong = text.length > MAX_SELECTION;
  return (
    <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        disabled={tooLong}
        // mousedown não pode limpar a seleção antes do clique
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onTranslate(text);
          window.getSelection()?.removeAllRanges();
        }}
        className="flex min-h-12 items-center gap-2 rounded-2xl bg-primary-500 px-5 font-semibold text-white shadow-lg animate-[rise_160ms_ease-out] disabled:opacity-70"
      >
        <Languages className="size-5" aria-hidden />
        {tooLong ? "Trecho longo demais (máx. 300 letras)" : "Traduzir trecho"}
      </button>
    </div>
  );
}
