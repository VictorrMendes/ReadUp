"use client";

import { PlayCircle } from "lucide-react";

import { speak } from "@/lib/speech";
import { splitAround } from "@/lib/vocabulary";

/** Frase de origem como citação, com a palavra destacada e o botão de ouvir a frase. */
export function ContextSentence({ sentence, word }: { sentence: string; word: string }) {
  const parts = splitAround(sentence, word);
  return (
    <div className="flex items-start gap-2 border-l-[3px] border-primary-200 pl-3">
      <p lang="en" className="flex-1 pt-2 font-serif text-[15px] leading-relaxed">
        {parts ? (
          <>
            {parts.before}
            <mark className="rounded bg-primary-100 px-0.5 font-semibold text-ink">{parts.match}</mark>
            {parts.after}
          </>
        ) : (
          sentence
        )}
      </p>
      <button
        type="button"
        onClick={() => speak(sentence)}
        aria-label="Ouvir a frase"
        className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper"
      >
        <PlayCircle className="size-5" aria-hidden />
      </button>
    </div>
  );
}
