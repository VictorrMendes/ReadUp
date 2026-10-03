"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Volume2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ContextSentence } from "@/components/reader/context-sentence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { advance, currentItem, firstPassTotal, startSession, type ReviewSession } from "@/lib/review-session";
import { speak } from "@/lib/speech";
import { useCountUp } from "@/lib/use-count-up";
import { answerReview, getReviewQueue, type ReviewQueue } from "@/lib/vocabulary";

// o cartão respondido sai (200 ms) antes do próximo entrar
const LEAVE_MS = 200;

// o que a revisão muda: fila, XP do dia, metas e estatísticas
const REVIEW_KEYS = [["review"], ["summary"], ["goal"], ["daily"], ["achievements"]];

/** Revisão espaçada das palavras salvas: cartão, tradução, "ainda aprendendo" ou "já sei". */
export default function ReviewPage() {
  const router = useRouter();
  const client = useQueryClient();
  // a fila é lida uma vez por sessão: refazer a busca no meio trocaria os cartões
  const queue = useQuery({
    queryKey: ["review-session"],
    queryFn: getReviewQueue,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [sending, setSending] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  // "já sei": check e o cartão sai para a direita; "ainda aprendendo": volta para a pilha (sem tremida)
  const [leaving, setLeaving] = useState<"known" | "learning" | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  if (queue.data && session === null) setSession(startSession(queue.data.cards));

  useEffect(() => () => REVIEW_KEYS.forEach((queryKey) => void client.invalidateQueries({ queryKey })), [client]);

  const close = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.replace("/vocabulario");
  }, [router]);

  const item = session ? currentItem(session) : null;

  const answer = useCallback(
    async (known: boolean) => {
      if (!session || !item || sending || leaving) return;
      const next = (updated: ReviewSession) => {
        setLeaving(known ? "known" : "learning");
        leaveTimer.current = setTimeout(() => {
          setSession(updated);
          setRevealed(false);
          setLeaving(null);
        }, LEAVE_MS);
      };
      // treino extra: a palavra já voltou para a caixa 0 no servidor, só avança aqui
      if (item.practice) {
        next(advance(session, known));
        return;
      }
      setSending(true);
      setAnswerError(null);
      try {
        const result = await answerReview(item.card.id, known);
        next(advance(session, known, result.xp_gained));
      } catch (e) {
        // 409: já respondida ou limite do dia (ex.: outra aba); segue sem contar
        if (e instanceof ApiError && e.status === 409) next(advance(session, known));
        else setAnswerError("Não foi possível salvar a resposta. Tente de novo.");
      } finally {
        setSending(false);
      }
    },
    [session, item, sending, leaving],
  );

  // atalhos: espaço/Enter mostra a tradução; 1 = ainda aprendendo; 2 = já sei; Esc fecha
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea")) {
        if (event.key === " " || event.key === "Enter") return;
      }
      if (event.key === "Escape") return close();
      if (!item) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
      } else if (revealed && event.key === "1") void answer(false);
      else if (revealed && event.key === "2") void answer(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, revealed, answer, close]);

  const total = session?.items.length ?? 0;
  const firstPass = session ? firstPassTotal(session) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-[640px] items-center gap-3 px-3 pt-3">
        <button
          type="button"
          aria-label="Fechar revisão"
          onClick={close}
          className="grid size-11 place-items-center rounded-xl hover:bg-black/5"
        >
          <X className="size-5" aria-hidden />
        </button>
        {session && total > 0 && (
          <div className="flex-1 pr-4">
            <ProgressBar value={session.index / total} size="thin" label="Progresso da revisão" />
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-6 pb-10 pt-6">
        {queue.isError ? (
          <Center>
            <p className="text-error-text">Não foi possível carregar a revisão.</p>
            <Button onClick={() => void queue.refetch()}>Tentar novamente</Button>
          </Center>
        ) : !session || !queue.data ? (
          <Center>
            <Loader2 className="size-6 animate-spin text-primary-500" aria-label="Carregando" />
          </Center>
        ) : item ? (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-ink-soft" aria-live="polite">
              {item.practice ? "Treino extra" : `${Math.min(session.index + 1, firstPass)} de ${firstPass}`}
            </p>
            <Card
              key={`${session.index}`}
              // novo cartão sobe; ao mostrar a tradução ele vira (a face troca na metade); respondido, sai
              className={`relative flex flex-col gap-5 ${
                leaving === "known"
                  ? "animate-[card-out-right_200ms_var(--ease-exit)_forwards]"
                  : leaving === "learning"
                    ? "animate-[card-out-down_200ms_var(--ease-exit)_forwards]"
                    : revealed
                      ? "animate-[flip_300ms_both]"
                      : "animate-[rise_280ms_var(--ease-enter)_both]"
              }`}
            >
              {leaving === "known" && (
                <CheckCircle2
                  className="absolute right-4 top-4 size-8 text-success-600 animate-[pop_200ms_var(--ease-enter)_both]"
                  aria-hidden
                />
              )}
              <div className="flex items-center justify-between gap-3">
                <h1 lang="en" className="font-serif text-3xl font-semibold">
                  {item.card.word}
                </h1>
                <button
                  type="button"
                  onClick={() => speak(item.card.word)}
                  aria-label={`Ouvir a pronúncia de ${item.card.word}`}
                  className="grid size-11 place-items-center rounded-xl text-primary-600 hover:bg-primary-50"
                >
                  <Volume2 className="size-5" aria-hidden />
                </button>
              </div>
              {item.card.context && <ContextSentence sentence={item.card.context} word={item.card.word} />}
              {revealed && (
                <p
                  aria-live="polite"
                  className={item.card.translation ? "text-xl font-semibold" : "text-ink-soft"}
                  style={{ animation: "rise 160ms var(--ease-enter) 150ms both" }}
                >
                  {item.card.translation ?? "Sem tradução salva"}
                </p>
              )}
            </Card>

            {answerError && (
              <p role="alert" className="text-sm text-error-text">
                {answerError}
              </p>
            )}
            {revealed ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" disabled={sending} onClick={() => void answer(false)}>
                  Ainda aprendendo <kbd className="hidden text-xs text-ink-soft lg:inline">1</kbd>
                </Button>
                <Button loading={sending} onClick={() => void answer(true)}>
                  Já sei <kbd className="hidden text-xs opacity-70 lg:inline">2</kbd>
                </Button>
              </div>
            ) : (
              <Button onClick={() => setRevealed(true)}>
                Mostrar tradução <kbd className="hidden text-xs opacity-70 lg:inline">espaço</kbd>
              </Button>
            )}
          </div>
        ) : (
          <Summary session={session} queue={queue.data} onClose={close} />
        )}
      </main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">{children}</div>;
}

function Summary({ session, queue, onClose }: { session: ReviewSession; queue: ReviewQueue; onClose: () => void }) {
  const empty = session.items.length === 0;
  const limitReached = empty && queue.reviewed_today >= queue.daily_limit;
  const xp = useCountUp(session.xp, { delay: 300 });
  const step = (i: number) => ({ animation: `rise 280ms var(--ease-enter) ${i * 90}ms both` });
  return (
    <Center>
      <Image src="/mascot.png" alt="" width={160} height={160} className="animate-[pop_300ms_ease-out]" />
      <h1 className="text-2xl font-bold" style={step(1)}>
        {empty ? "Nada para revisar agora" : "Revisão concluída"}
      </h1>
      {empty ? (
        <p className="text-ink-soft">
          {limitReached
            ? `Você já revisou ${queue.daily_limit} palavras hoje. Volte amanhã!`
            : "Palavras salvas entram na revisão no dia seguinte."}
        </p>
      ) : (
        // mesmo estilo da conclusão de leitura: o que foi feito, sem vermelho para o que falta
        <div className="grid w-full max-w-xs grid-cols-2 gap-3" style={step(2)}>
          <div className="rounded-2xl border border-success-100 bg-success-100/40 p-4">
            <p className="text-2xl font-bold tabular-nums">{formatNumber(session.known)}</p>
            <p className="text-xs text-ink-soft">já sabia</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-2xl font-bold tabular-nums">{formatNumber(session.learning)}</p>
            <p className="text-xs text-ink-soft">ainda aprendendo</p>
          </div>
        </div>
      )}
      {session.xp > 0 && (
        <span style={step(3)}>
          <Badge tone="primary">
            <span aria-hidden>+{formatNumber(xp)} XP</span>
            <span className="sr-only">+{formatNumber(session.xp)} XP</span>
          </Badge>
        </span>
      )}
      <Button onClick={onClose}>Voltar ao vocabulário</Button>
    </Center>
  );
}
