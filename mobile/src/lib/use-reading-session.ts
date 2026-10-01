import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type { AchievementRef } from "@/lib/achievements";
import { ApiError } from "@/lib/api";
import { saveProgress, type ProgressResult } from "@/lib/reading";

export const SEND_EVERY_SECONDS = 15;
const MAX_SECONDS_PER_SEND = 120; // limite do backend

// Acumulado da sessão: XP e palavras creditadas somados das respostas, se a meta do dia foi
// cumprida durante ela, a ofensiva da última resposta e as conquistas desbloqueadas (sem repetir).
export type SessionGains = {
  xp: number;
  words: number;
  goalMet: boolean;
  streak: number;
  achievements: AchievementRef[];
};

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
  let queued: { open: boolean; force: boolean } | null = null;
  // quem pediu "Concluir leitura" e espera a resposta desse envio
  let finishers: { resolve: (r: ProgressResult) => void; reject: (e: unknown) => void }[] = [];
  let xp = 0;
  let words = 0;
  const achievements: AchievementRef[] = [];
  // estado da meta na primeira resposta (abertura): só conta como cumprida na sessão se virou depois
  let goalMetBefore: boolean | null = null;

  // open: envio de abertura (0 s), mesmo sem nada novo a enviar
  // force: envio do "Concluir leitura", mesmo sem tempo ou avanço novos (resolve os finishers)
  async function flush(open = false, force = false) {
    if (inFlight) {
      queued = {
        open: open || (queued?.open ?? false),
        force: force || (queued?.force ?? false),
      };
      return;
    }
    const seconds = open ? 0 : Math.min(MAX_SECONDS_PER_SEND, pendingSeconds);
    const progress = maxProgress;
    if (!open && !force && seconds === 0 && progress <= sentProgress) return;
    const waiting = force ? finishers : [];
    if (force) finishers = [];

    inFlight = true;
    pendingSeconds -= seconds;
    secondsSinceSend = 0;
    try {
      const result = await send(progress, seconds);
      xp += result.xp_gained;
      words += result.words_credited;
      goalMetBefore ??= result.goal_met;
      for (const unlocked of result.achievements_unlocked) {
        if (!achievements.some((a) => a.id === unlocked.id)) achievements.push(unlocked);
      }
      onResult(result, {
        xp,
        words,
        goalMet: result.goal_met && !goalMetBefore,
        streak: result.streak,
        achievements: [...achievements],
      });
      sentProgress = Math.max(sentProgress, progress);
      waiting.forEach((f) => f.resolve(result));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onUnauthorized();
      // rede/servidor: devolve os segundos; outros 4xx não vão melhorar com retry
      else if (!(e instanceof ApiError) || e.status >= 500) pendingSeconds += seconds;
      waiting.forEach((f) => f.reject(e));
    } finally {
      inFlight = false;
      if (queued) {
        const next = queued;
        queued = null;
        void flush(next.open, next.force);
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
    /**
     * "Concluir leitura": envia já (progresso 100 e os segundos acumulados) e devolve a resposta
     * desse envio. Com outro envio em andamento, entra na fila e roda assim que ele terminar.
     */
    finish(): Promise<ProgressResult> {
      maxProgress = 100;
      return new Promise((resolve, reject) => {
        finishers.push({ resolve, reject });
        void flush(false, true);
      });
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
  const [gains, setGains] = useState<SessionGains>({
    xp: 0,
    words: 0,
    goalMet: false,
    streak: 0,
    achievements: [],
  });
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

  const finish = useCallback(
    (): Promise<ProgressResult> =>
      session.current?.finish() ?? Promise.reject(new Error("Sessão de leitura inativa")),
    [],
  );

  return { result, gains, reportProgress, finish };
}
