import { expect, test } from "vitest";

import { endState, scrollProgress, secondsToComplete } from "./reading";

test("progresso da rolagem", () => {
  expect(scrollProgress(0, 500, 800)).toBe(1); // cabe na tela
  expect(scrollProgress(100, 1200, 800)).toBe(0.25);
  expect(scrollProgress(999, 1200, 800)).toBe(1);
});

test("fim do texto", () => {
  expect(endState(true, null)).toEqual({ kind: "done" });
  expect(endState(false, null)).toEqual({ kind: "ready" });
  expect(endState(false, { kind: "too-fast", wordCount: 300, wordsRead: 100 })).toEqual({
    kind: "too-fast",
    seconds: secondsToComplete(300, 100),
  });
});
