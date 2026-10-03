import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { ProgressResult } from "./reading";
import { SEND_EVERY_SECONDS, startReadingSession } from "./reading-session";

const result = (over: Partial<ProgressResult> = {}): ProgressResult => ({
  progress: 0,
  words_read: 0,
  words_credited: 0,
  completed: false,
  xp_gained: 0,
  goal_met: false,
  streak: 0,
  streak_active_today: false,
  achievements_unlocked: [],
  ...over,
});

let hidden = false;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => (hidden ? "hidden" : "visible"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup() {
  const send = vi.fn(async (progress: number, seconds: number) => {
    void progress;
    void seconds;
    return result({ xp_gained: 1, words_credited: 10 });
  });
  const onResult = vi.fn();
  const session = startReadingSession({ send, initialProgress: 0, onResult, onUnauthorized: vi.fn() });
  return { send, onResult, session };
}

test("abre a sessão com 0 s e envia a cada 15 s de leitura com o maior progresso", async () => {
  const { send, session } = setup();
  await vi.advanceTimersByTimeAsync(0);
  expect(send).toHaveBeenLastCalledWith(0, 0);

  session.report(40.7);
  await vi.advanceTimersByTimeAsync(SEND_EVERY_SECONDS * 1000);
  expect(send).toHaveBeenLastCalledWith(40, SEND_EVERY_SECONDS);
  session.stop();
});

test("aba escondida não conta tempo; esconder envia o que já tinha", async () => {
  const { send, session } = setup();
  await vi.advanceTimersByTimeAsync(5000);
  hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(0);
  expect(send).toHaveBeenLastCalledWith(0, 5);

  await vi.advanceTimersByTimeAsync(60_000);
  expect(send).toHaveBeenCalledTimes(2); // nada novo enquanto escondida
  session.stop();
});

test("concluir envia progresso 100 e devolve a resposta", async () => {
  const { send, session } = setup();
  await vi.advanceTimersByTimeAsync(3000);
  const answer = await session.finish();
  expect(send).toHaveBeenLastCalledWith(100, 3);
  expect(answer.xp_gained).toBe(1);
  session.stop();
});

test("ofensiva +1 só quando o mínimo do dia vira durante a sessão", async () => {
  const onResult = vi.fn();
  const responses = [
    result({ streak: 4 }), // abertura: ofensiva de ontem, hoje ainda não contou
    result({ streak: 5, streak_active_today: true, words_credited: 60 }),
  ];
  const session = startReadingSession({
    send: async () => responses.shift() ?? result({ streak: 5, streak_active_today: true }),
    initialProgress: 0,
    onResult,
    onUnauthorized: () => {},
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ streakUp: false, streak: 4 }));

  session.report(40);
  await vi.advanceTimersByTimeAsync(SEND_EVERY_SECONDS * 1000);
  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ streakUp: true, streak: 5 }));
  session.stop();
});

test("ofensiva já mantida antes da sessão não conta como +1 nela", async () => {
  const onResult = vi.fn();
  const session = startReadingSession({
    send: async () => result({ streak: 5, streak_active_today: true }),
    initialProgress: 0,
    onResult,
    onUnauthorized: () => {},
  });
  session.report(40);
  await vi.advanceTimersByTimeAsync(SEND_EVERY_SECONDS * 1000);
  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ streakUp: false }));
  session.stop();
});
