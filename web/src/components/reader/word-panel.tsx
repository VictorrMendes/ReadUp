"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, CheckCircle2, Languages, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ContextSentence } from "@/components/reader/context-sentence";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { speak, stopSpeaking } from "@/lib/speech";
import { deleteWord, lookupWord, saveWord, translateSentence, type Lookup } from "@/lib/vocabulary";

// word null: a pessoa selecionou um trecho (frase) para traduzir
export type WordSelection = { word: string | null; sentence: string };

type Props = { selection: WordSelection | null; articleId: number; onClose: () => void };

export function WordPanel({ selection, articleId, onClose }: Props) {
  // para a voz ao trocar de palavra/trecho ou fechar (não a cada render da tela)
  const key = selection ? `${selection.word ?? ""}|${selection.sentence}` : null;
  useEffect(() => () => stopSpeaking(), [key]);
  return (
    <Sheet open={selection !== null} onClose={onClose} label={selection?.word ? `Palavra ${selection.word}` : "Frase"}>
      {selection &&
        (selection.word === null ? (
          <SentenceContent key={selection.sentence} sentence={selection.sentence} articleId={articleId} />
        ) : (
          <WordContent key={selection.word} word={selection.word} sentence={selection.sentence} articleId={articleId} />
        ))}
    </Sheet>
  );
}

type SentenceState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; translation: string | null }
  | { kind: "error"; message: string };

function useSentenceTranslation(articleId: number) {
  const [state, setState] = useState<SentenceState>({ kind: "idle" });
  async function request(sentence: string) {
    setState({ kind: "loading" });
    try {
      const result = await translateSentence(articleId, sentence);
      setState({ kind: "done", translation: result.translation });
    } catch (e) {
      setState({
        kind: "error",
        message:
          e instanceof ApiError && e.status === 429
            ? "Você atingiu o limite de traduções de frase de hoje. Volte amanhã!"
            : e instanceof ApiError && e.status === 422
              ? "Selecione um trecho do texto (até 300 caracteres)."
              : "Tradução da frase indisponível no momento.",
      });
    }
  }
  return { state, request };
}

function SentenceTranslation({ state }: { state: SentenceState }) {
  if (state.kind === "loading") return <Skeleton className="h-5 w-4/5" />;
  if (state.kind === "error") return <p aria-live="polite" className="text-sm text-ink-soft">{state.message}</p>;
  if (state.kind === "done")
    return (
      <div aria-live="polite" className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Tradução da frase</p>
        <p>{state.translation ?? "Tradução da frase indisponível no momento."}</p>
      </div>
    );
  return null;
}

function SpeakButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-xl text-primary-600 hover:bg-primary-50"
    >
      <Volume2 className="size-6" aria-hidden />
    </button>
  );
}

function SentenceContent({ sentence, articleId }: { sentence: string; articleId: number }) {
  const { state, request } = useSentenceTranslation(articleId);
  useEffect(() => {
    void request(sentence);
    // a frase foi escolhida para ser traduzida: pede ao abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence]);
  return (
    <div className="flex flex-col gap-4 pr-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Trecho</p>
      <div className="flex items-start gap-2">
        <p lang="en" className="flex-1 font-serif text-lg leading-relaxed">
          {sentence}
        </p>
        <SpeakButton text={sentence} label="Ouvir o trecho" />
      </div>
      <SentenceTranslation state={state} />
      <p className="text-xs text-ink-soft">Dica: clique numa palavra para ver a tradução dela e salvá-la.</p>
    </div>
  );
}

function WordContent({ word, sentence, articleId }: { word: string; sentence: string; articleId: number }) {
  const client = useQueryClient();
  // a tradução é estável, mas "salva" muda (aqui, no Vocabulário ou no celular): sem cache eterno
  const lookup = useQuery({ queryKey: ["lookup", word], queryFn: () => lookupWord(word) });
  const sentenceTranslation = useSentenceTranslation(articleId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentSaved = lookup.data?.saved_id ?? null;

  function setSavedId(id: number | null) {
    client.setQueryData<Lookup>(["lookup", word], (data) => (data ? { ...data, saved_id: id } : data));
    void client.invalidateQueries({ queryKey: ["words"] });
    void client.invalidateQueries({ queryKey: ["summary"] });
  }

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      const created = await saveWord({ word, article_id: articleId, context: sentence });
      setSavedId(created.id);
    }, "Não foi possível salvar. Tente novamente.");

  const remove = () =>
    run(async () => {
      if (currentSaved === null) return;
      await deleteWord(currentSaved);
      setSavedId(null);
    }, "Não foi possível remover. Tente novamente.");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 pr-10">
        <h2 lang="en" className="font-serif text-3xl font-semibold">
          {word}
        </h2>
        <SpeakButton text={word} label={`Ouvir a pronúncia de ${word}`} />
      </div>
      {lookup.isPending ? (
        <Skeleton className="h-6 w-3/5" />
      ) : lookup.data?.translation ? (
        <p className="text-xl font-semibold">{lookup.data.translation}</p>
      ) : (
        <p className="text-ink-soft">Tradução indisponível no momento</p>
      )}
      <ContextSentence sentence={sentence} word={word} />
      {sentenceTranslation.state.kind === "idle" ? (
        <Button
          variant="ghost"
          icon={<Languages className="size-4" aria-hidden />}
          onClick={() => void sentenceTranslation.request(sentence)}
          className="self-start"
        >
          Traduzir a frase
        </Button>
      ) : (
        <SentenceTranslation state={sentenceTranslation.state} />
      )}
      {error && <p role="alert" className="text-sm text-error-text">{error}</p>}
      {currentSaved !== null ? (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-5 text-success-600" aria-hidden /> Palavra salva
          </span>
          <Button variant="ghost" loading={busy} onClick={() => void remove()}>
            Remover
          </Button>
        </div>
      ) : (
        <Button
          block
          icon={<Bookmark className="size-4" aria-hidden />}
          loading={busy}
          disabled={lookup.isPending}
          onClick={() => void save()}
        >
          Salvar palavra
        </Button>
      )}
    </div>
  );
}
