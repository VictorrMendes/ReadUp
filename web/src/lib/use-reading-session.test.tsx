import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { ProgressResult } from "./reading";

const saveProgress = vi.fn(
  async (body: { article_id: number; progress: number; seconds: number }): Promise<ProgressResult> => ({
    progress: body.progress,
    words_read: 0,
    words_credited: 10,
    completed: false,
    xp_gained: 2,
    goal_met: false,
    streak: 0,
    achievements_unlocked: [],
  }),
);
vi.mock("./reading", () => ({ saveProgress: (body: never) => saveProgress(body) }));

const { useReadingSession, SEND_EVERY_SECONDS } = await import("./reading-session");

beforeEach(() => {
  vi.useFakeTimers();
  saveProgress.mockClear();
});
afterEach(() => vi.useRealTimers());

test("texto buscado de novo com outro progresso não reinicia a sessão nem zera os ganhos", async () => {
  const { result, rerender } = renderHook((props) => useReadingSession(props), {
    initialProps: { articleId: 7, enabled: true, initialProgress: 10 },
  });
  await act(() => vi.advanceTimersByTimeAsync(SEND_EVERY_SECONDS * 1000));
  const xpBefore = result.current.gains.xp;
  expect(xpBefore).toBeGreaterThan(0);
  const opens = saveProgress.mock.calls.filter(([body]) => body.seconds === 0).length;

  // foco da aba: o artigo volta com o progresso já salvo
  rerender({ articleId: 7, enabled: true, initialProgress: 35 });
  await act(() => vi.advanceTimersByTimeAsync(0));

  expect(saveProgress.mock.calls.filter(([body]) => body.seconds === 0)).toHaveLength(opens);
  expect(result.current.gains.xp).toBe(xpBefore);
});

test("outro texto começa uma sessão nova", async () => {
  const { rerender } = renderHook((props) => useReadingSession(props), {
    initialProps: { articleId: 7, enabled: true, initialProgress: 0 },
  });
  await act(() => vi.advanceTimersByTimeAsync(0));
  rerender({ articleId: 8, enabled: true, initialProgress: 50 });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(saveProgress).toHaveBeenLastCalledWith({ article_id: 8, progress: 50, seconds: 0 });
});
