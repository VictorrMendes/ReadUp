import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { ApiError } from "@/lib/api";
import { saveProgress, type ProgressResult } from "@/lib/reading";

export const SEND_EVERY_SECONDS = 15;
const MAX_SECONDS_PER_SEND = 120; // limite do backend

// Acumulado da sessão: XP somado das respostas, se a meta do dia foi cumprida durante ela e a
// ofensiva da última resposta.
export type SessionGains = { xp: number; goalMet: boolean; streak: number };

type SessionOptions = {
  send: (progress: number, seconds: number) => Promise<ProgressResult>;
  initialProgress: number;
  onResult: (result: ProgressResult, gains: SessionGains) => void;
  onUnauthorized: () => void;
};

/**
 * Sessão de leitura de um texto: conta segundos só com o app em primeiro plano, guarda o maior
 * progresso de rolagem e envia a cada 15 s de leitura, ao ir para background e no stop().
 * Ao iniciar e ao voltar para o app, envia 0 s para (re)abrir a sessão no servidor, que não
 * credita o primeiro envio nem o que vem depois de uma pausa longa.
 * Falha de rede/servidor mantém os segundos para o próximo envio.
 */
export function startReadingSession({
  send,
  initialProgress,
  onResult,
  onUnauthorized,
}: SessionOptions) {
  let maxProgress = initialProgress;
  let sentProgress = initialProgress;
  let pendingSeconds = 0;
  let secondsSinceSend = 0;
  let inFlight = false;
  // pedido de envio que chegou durante outro envio (stop, background, reabertura): roda ao
  // terminar o atual, em vez de ser descartado; open vence se algum dos pedidos era abertura
  let queued: { open: boolean } | null = null;
  let xp = 0;
  // estado da meta na primeira resposta (abertura): só conta como cumprida na sessão se virou depois
  let goalMetBefore: boolean | null = null;

  // open: envio de abertura (0 s), mesmo sem nada novo a enviar
  async function flush(open = false) {
    if (inFlight) {
      queued = { open: open || (queued?.open ?? false) };
      return;
    }
    const seconds = open ? 0 : Math.min(MAX_SECONDS_PER_SEND, pendingSeconds);
    const progress = maxProgress;
    if (!open && seconds === 0 && progress <= sentProgress) return;

    inFlight = true;
    pendingSeconds -= seconds;
    secondsSinceSend = 0;
    try {
      const result = await send(progress, seconds);
      xp += result.xp_gained;
      goalMetBefore ??= result.goal_met;
      onResult(result, {
        xp,
        goalMet: result.goal_met && !goalMetBefore,
        streak: result.streak,
      });
      sentProgress = Math.max(sentProgress, progress);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onUnauthorized();
      // rede/servidor: devolve os segundos; outros 4xx não vão melhorar com retry
      else if (!(e instanceof ApiError) || e.status >= 500) pendingSeconds += seconds;
    } finally {
      inFlight = false;
      if (queued) {
        const next = queued;
        queued = null;
        void flush(next.open);
      }
    }
  }

  const timer = setInterval(() => {
    if (AppState.currentState !== "active") return;
    pendingSeconds += 1;
    secondsSinceSend += 1;
    if (secondsSinceSend >= SEND_EVERY_SECONDS) void flush();
  }, 1000);
  const subscription = AppState.addEventListener("change", (state) => {
    void flush(state === "active");
  });
  void flush(true);

  return {
    report(percent: number) {
      maxProgress = Math.max(maxProgress, Math.floor(percent));
    },
    stop() {
      clearInterval(timer);
      subscription.remove();
      void flush();
    },
  };
}

type ReadingSession = ReturnType<typeof startReadingSession>;

/** Liga uma sessão de leitura ao ciclo de vida da tela (para e envia ao sair). */
export function useReadingSession({
  token,
  articleId,
  enabled,
  initialProgress,
  onUnauthorized,
}: {
  token: string | null;
  articleId: number;
  enabled: boolean;
  initialProgress: number;
  onUnauthorized: () => void;
}) {
  const [result, setResult] = useState<ProgressResult | null>(null);
  const [gains, setGains] = useState<SessionGains>({ xp: 0, goalMet: false, streak: 0 });
  const session = useRef<ReadingSession | null>(null);
  // progresso reportado antes da sessão começar (ex.: onLayout de texto que cabe na tela)
  const reportedEarly = useRef(0);

  useEffect(() => {
    if (!enabled || !token) return;
    const current = startReadingSession({
      send: (progress, seconds) =>
        saveProgress(token, { article_id: articleId, progress, seconds }),
      initialProgress,
      onResult: (latest, sessionGains) => {
        setResult(latest);
        setGains(sessionGains);
      },
      onUnauthorized,
    });
    current.report(reportedEarly.current);
    session.current = current;
    return () => {
      current.stop();
      session.current = null;
    };
  }, [enabled, token, articleId, initialProgress, onUnauthorized]);

  const reportProgress = useCallback((percent: number) => {
    reportedEarly.current = Math.max(reportedEarly.current, Math.floor(percent));
    session.current?.report(percent);
  }, []);

  return { result, gains, reportProgress };
}
