import { scrollProgress } from "./reading";

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
