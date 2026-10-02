"use client";

import { memo, useMemo, type CSSProperties } from "react";

import { chunkParagraph, sentenceText } from "@/lib/vocabulary";

export type ReaderSelection = { paragraph: number; chunk: number; word: string; sentence: string };

type Props = {
  text: string;
  index: number;
  selectedChunk: number | null;
  markColor: string;
  style: CSSProperties;
  onSelect: (selection: ReaderSelection) => void;
};

// Cada palavra é um <span> clicável dentro do parágrafo (o texto continua corrido e selecionável).
// Clique sem seleção abre a palavra; arrastar para selecionar fica com a barra "Traduzir trecho".
export const Paragraph = memo(function Paragraph({ text, index, selectedChunk, markColor, style, onSelect }: Props) {
  const chunks = useMemo(() => chunkParagraph(text), [text]);
  return (
    <p className="mb-6" style={style} data-paragraph={index} lang="en">
      {chunks.map((chunk, i) => {
        const word = chunk.word;
        if (word === null) return <span key={i}>{chunk.text}</span>;
        return (
          <span
            key={i}
            className="group cursor-pointer"
            onClick={() => {
              // arrastando para selecionar um trecho: não é clique de palavra
              if (window.getSelection()?.isCollapsed === false) return;
              onSelect({ paragraph: index, chunk: i, word, sentence: sentenceText(chunks, chunk.sentence) });
            }}
          >
            {chunk.text.slice(0, chunk.start)}
            {/* o bloco inteiro é clicável; o destaque e o sublinhado ficam só na palavra */}
            <span
              className="rounded-sm decoration-2 underline-offset-4 group-hover:underline"
              style={i === selectedChunk ? { background: markColor } : undefined}
            >
              {chunk.text.slice(chunk.start, chunk.end)}
            </span>
            {chunk.text.slice(chunk.end)}
          </span>
        );
      })}
    </p>
  );
});
