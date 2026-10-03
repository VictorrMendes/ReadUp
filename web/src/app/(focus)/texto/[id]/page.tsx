"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Type } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Completion } from "@/components/reader/completion";
import { Paragraph, type ReaderSelection } from "@/components/reader/paragraph";
import { SelectionBar } from "@/components/reader/selection-bar";
import { SettingsPanel } from "@/components/reader/settings-panel";
import { WordPanel, type WordSelection } from "@/components/reader/word-panel";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api";
import { getArticle, listArticles, pickNextText } from "@/lib/articles";
import { bookTitle } from "@/lib/books";
import { formatNumber } from "@/lib/format";
import { READER_THEMES, bodyStyle, titleStyle, useReaderSettings } from "@/lib/reader-settings";
import { endState, windowScrollProgress, type FinishAttempt } from "@/lib/reading";
import { useReadingSession } from "@/lib/reading-session";
import { useMe } from "@/lib/session";
import { getSummary } from "@/lib/stats";
import { getGoal, type GoalStatus } from "@/lib/user";
import { listWords } from "@/lib/vocabulary";

// o que muda quando a pessoa lê: o app recarrega essas listas ao voltar
const READING_KEYS = [["goal"], ["summary"], ["daily"], ["continue"], ["articles"], ["achievements"], ["books"], ["book"], ["words"], ["review"]];

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const articleId = Number(id);
  const validId = Number.isInteger(articleId) && articleId > 0;
  const router = useRouter();
  const client = useQueryClient();
  const { data: user } = useMe();
  const article = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => getArticle(articleId),
    enabled: validId,
    staleTime: 0,
  });
  const { settings, update: updateSettings } = useReaderSettings();
  const theme = READER_THEMES[settings.theme];
  const paragraphStyle = useMemo(() => bodyStyle(settings), [settings]);
  // palavras salvas ganham um sublinhado discreto quando reaparecem (reencontro = repetição natural)
  const words = useQuery({ queryKey: ["words"], queryFn: listWords });
  const savedWords = useMemo(() => new Set(words.data?.map((w) => w.word)), [words.data]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selection, setSelection] = useState<(ReaderSelection | { paragraph: -1; chunk: -1; word: null; sentence: string }) | null>(null);
  const [progress, setProgress] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [finishedHere, setFinishedHere] = useState(false);
  const [attempt, setAttempt] = useState<FinishAttempt>(null);
  const [celebration, setCelebration] = useState<{ goal: GoalStatus | null; longest: number | null } | null>(null);
  const container = useRef<HTMLElement>(null);
  const resumed = useRef(false);

  const data = article.data;
  const { gains, reportProgress, finish } = useReadingSession({
    articleId,
    enabled: !!data,
    initialProgress: data?.progress ?? 0,
  });

  // progresso pela rolagem da janela
  useEffect(() => {
    if (!data) return;
    const onScroll = () => {
      const value = windowScrollProgress();
      reportProgress(value * 100);
      setProgress(Math.round(value * 100) / 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [data, reportProgress]);

  // retoma de onde parou, uma vez, depois que o texto foi desenhado
  useEffect(() => {
    if (!data || resumed.current) return;
    resumed.current = true;
    if (data.progress > 0 && !data.completed) {
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        window.scrollTo({ top: ((doc.scrollHeight - window.innerHeight) * data.progress) / 100 });
      });
    }
  }, [data]);

  // ao sair do texto, as telas que mostram progresso recarregam
  useEffect(
    () => () => READING_KEYS.forEach((queryKey) => void client.invalidateQueries({ queryKey })),
    [client],
  );

  const onSelectWord = useCallback((value: ReaderSelection) => setSelection(value), []);
  const closePanel = useCallback(() => setSelection(null), []);

  async function onFinish() {
    if (!data) return;
    setFinishing(true);
    setAttempt(null);
    try {
      const response = await finish();
      if (!response.completed) {
        setAttempt({ kind: "too-fast", wordCount: data.word_count, wordsRead: response.words_read });
        return;
      }
      const [goal, summary] = await Promise.all([getGoal().catch(() => null), getSummary().catch(() => null)]);
      setFinishedHere(true);
      setCelebration({ goal, longest: summary?.streak_longest ?? null });
    } catch {
      setAttempt({ kind: "error" });
    } finally {
      setFinishing(false);
    }
  }

  async function openNextText() {
    try {
      const next = pickNextText(await listArticles(user?.english_level ?? null), articleId);
      if (next) return router.replace(`/texto/${next.id}`);
    } catch {
      // sem lista: cai na aba Ler
    }
    router.push("/ler");
  }

  const back = () => (window.history.length > 1 ? router.back() : router.replace("/"));

  if (!validId || (article.error instanceof ApiError && article.error.status === 404)) {
    return (
      <Centered>
        <p>Texto não encontrado</p>
        <Button variant="secondary" onClick={() => router.replace("/ler")}>
          Ver textos
        </Button>
      </Centered>
    );
  }
  if (article.isError) {
    return (
      <Centered>
        <p className="text-error-text">{errorMessage(article.error, "Não foi possível abrir o texto.")}</p>
        <Button onClick={() => void article.refetch()}>Tentar novamente</Button>
      </Centered>
    );
  }

  const done = !!data?.completed || finishedHere;
  const bookId = data?.book_id ?? null;
  const nextChapter = data?.next_article_id ?? null;
  const primary =
    bookId === null
      ? { label: "Próximo texto", onClick: () => void openNextText() }
      : nextChapter !== null
        ? { label: "Próximo capítulo", onClick: () => router.replace(`/texto/${nextChapter}`) }
        : null;
  const secondary =
    bookId === null
      ? { label: "Ver mais textos", onClick: () => router.push("/ler") }
      : { label: "Voltar ao livro", onClick: () => router.push(`/livro/${bookId}`) };
  const state = endState(done, attempt);
  const paragraphs = data?.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) ?? [];

  return (
    <div
      className={`min-h-dvh transition-colors ${theme.dark ? "reader-dark" : ""}`}
      style={{ background: theme.background, color: theme.text }}
    >
      <header className="sticky top-0 z-20 border-b" style={{ background: theme.background, borderColor: theme.border }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-2 py-2">
          <IconAction label="Voltar" onClick={back}>
            <ArrowLeft className="size-6" aria-hidden />
          </IconAction>
          <div className="flex-1">
            {data && (
              <ProgressBar
                value={progress}
                size="thin"
                label="Progresso da leitura"
                colors={{ track: theme.border, fill: theme.link }}
              />
            )}
          </div>
          <IconAction label="Aparência do texto" onClick={() => setSettingsOpen(true)}>
            <Type className="size-6" aria-hidden />
          </IconAction>
        </div>
      </header>

      <main ref={container} className="mx-auto max-w-[680px] px-6 pb-40 pt-8">
        {!data ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            <h1 style={titleStyle(settings)} lang="en">
              {data.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 text-sm" style={{ color: theme.secondary }}>
              <span>
                {[data.book_title ? bookTitle(data.book_title) : data.category, data.difficulty, `${data.estimated_minutes} min`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {done && (
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: theme.text }}>
                  <CheckCircle2 className="size-4 text-success-600" aria-hidden /> Concluído
                </span>
              )}
            </div>
            <p className="mb-8 mt-2 text-xs" style={{ color: theme.secondary }}>
              Toque numa palavra para traduzir · selecione um trecho para traduzir a frase
            </p>
            {paragraphs.map((paragraph, index) => (
              <Paragraph
                key={index}
                text={paragraph}
                index={index}
                selectedChunk={selection?.paragraph === index ? selection.chunk : null}
                markColor={theme.mark}
                saved={savedWords}
                savedColor={theme.link}
                style={paragraphStyle}
                onSelect={onSelectWord}
              />
            ))}
            {data.attribution && (
              <p className="mb-2 text-xs" style={{ color: theme.secondary }}>
                {data.attribution}
                {data.source_url?.startsWith("https://") && (
                  <>
                    {" · "}
                    <a href={data.source_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: theme.link }}>
                      Ler original
                    </a>
                  </>
                )}
              </p>
            )}
            <section className="mt-8 flex flex-col gap-3 border-t pt-8" style={{ borderColor: theme.border }}>
              {state.kind === "done" ? (
                <>
                  <p className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="size-5 text-success-600" aria-hidden /> Você já concluiu este texto
                  </p>
                  {primary && <Button onClick={primary.onClick}>{primary.label}</Button>}
                  <Button variant={primary ? (theme.dark ? "secondary" : "ghost") : "primary"} onClick={secondary.onClick}>
                    {secondary.label}
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">Você chegou ao fim</h2>
                  <Button loading={finishing} onClick={() => void onFinish()} icon={<CheckCircle2 className="size-4" aria-hidden />}>
                    Concluir leitura
                  </Button>
                  {state.kind === "too-fast" && (
                    <p aria-live="polite" className="text-sm" style={{ color: theme.secondary }}>
                      Você passou rápido por este texto. Para contar como lido, leia com calma: faltam cerca de{" "}
                      {formatNumber(state.seconds)} {state.seconds === 1 ? "segundo" : "segundos"} de leitura.
                    </p>
                  )}
                  {state.kind === "error" && (
                    <p aria-live="polite" className="text-sm" style={{ color: theme.secondary }}>
                      Não foi possível confirmar agora. Tente de novo.
                    </p>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>

      <SelectionBar
        container={container}
        onTranslate={(text) => setSelection({ paragraph: -1, chunk: -1, word: null, sentence: text })}
      />
      <WordPanel
        selection={selection ? ({ word: selection.word, sentence: selection.sentence } satisfies WordSelection) : null}
        articleId={articleId}
        onClose={closePanel}
      />
      <SettingsPanel open={settingsOpen} settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
      {data && celebration && (
        <Completion
          articleTitle={data.title}
          minutes={data.estimated_minutes}
          gains={gains}
          goal={celebration.goal}
          longestStreak={celebration.longest}
          primary={primary && { label: primary.label, onClick: () => { setCelebration(null); primary.onClick(); } }}
          secondary={{ label: secondary.label, onClick: () => { setCelebration(null); secondary.onClick(); } }}
          onClose={() => setCelebration(null)}
          onFinishForToday={() => {
            setCelebration(null);
            router.push("/");
          }}
        />
      )}
    </div>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid size-11 place-items-center rounded-xl hover:bg-black/5">
      {children}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center p-6 text-center"><div className="flex flex-col items-center gap-4">{children}</div></div>;
}
