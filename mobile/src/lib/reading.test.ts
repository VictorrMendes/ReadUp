import { endState, scrollProgress, secondsToComplete } from "./reading";
import { formatLongDate } from "./format";

test.each([
  ["topo", 0, 2000, 1000, 0],
  ["meio", 500, 2000, 1000, 0.5],
  ["fim", 1000, 2000, 1000, 1],
  ["conteúdo menor que a tela", 0, 600, 1000, 1],
  ["conteúdo igual à tela", 0, 1000, 1000, 1],
  ["bounce acima do topo (iOS)", -80, 2000, 1000, 0],
  ["bounce além do fim (iOS)", 1200, 2000, 1000, 1],
])("%s", (_, offsetY, contentHeight, viewportHeight, expected) => {
  expect(scrollProgress(offsetY, contentHeight, viewportHeight)).toBe(expected);
});

test.each([
  [300, 150, 15], // 150 palavras a 10/s
  [300, 295, 1], // 5 palavras: arredonda para cima
  [300, 300, 1], // nunca 0 ("cerca de 1 segundo")
  [141, 0, 15],
])("secondsToComplete(%p, %p) = %p", (wordCount, wordsRead, seconds) => {
  expect(secondsToComplete(wordCount, wordsRead)).toBe(seconds);
});

test("endState: concluído vence qualquer tentativa", () => {
  expect(endState(true, null)).toEqual({ kind: "done" });
  expect(endState(true, { kind: "error" })).toEqual({ kind: "done" });
});

test("endState: sem toque, pronto para concluir", () => {
  expect(endState(false, null)).toEqual({ kind: "ready" });
});

test("endState: rápido demais mostra os segundos que faltam", () => {
  expect(endState(false, { kind: "too-fast", wordCount: 300, wordsRead: 90 })).toEqual({
    kind: "too-fast",
    seconds: 21,
  });
});

test("endState: erro de rede", () => {
  expect(endState(false, { kind: "error" })).toEqual({ kind: "error" });
});

test("formatLongDate: dia da semana e mês por extenso", () => {
  expect(formatLongDate(new Date(2026, 8, 30))).toBe("Quarta, 30 de setembro");
  expect(formatLongDate(new Date(2026, 0, 4))).toBe("Domingo, 4 de janeiro");
});
