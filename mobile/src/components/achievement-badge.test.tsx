import { render, screen } from "@testing-library/react-native";

import { AchievementBadge, achievementIcon } from "./achievement-badge";

const WORDS_10K = {
  id: "words-10k",
  title: "Dez mil palavras",
  icon: "reader",
  target: 10000,
  current: 3200,
  unlocked: false,
};

test("bloqueada: progresso em pt-BR, cadeado e rótulo acessível com a unidade", async () => {
  await render(<AchievementBadge achievement={WORDS_10K} />);

  expect(screen.getByText("Dez mil palavras")).toBeOnTheScreen();
  expect(screen.getByText("3.200 / 10.000")).toBeOnTheScreen();
  expect(screen.queryByText("Desbloqueada")).not.toBeOnTheScreen();
  expect(
    screen.getByLabelText("Dez mil palavras, bloqueada, 3.200 de 10.000 palavras"),
  ).toBeOnTheScreen();
});

test("desbloqueada: check, 'Desbloqueada' e rótulo acessível", async () => {
  await render(
    <AchievementBadge
      achievement={{ ...WORDS_10K, id: "words-1k", title: "Mil palavras", target: 1000, current: 1000, unlocked: true }}
    />,
  );

  expect(screen.getByText("Desbloqueada")).toBeOnTheScreen();
  expect(screen.queryByText(/\//)).not.toBeOnTheScreen();
  expect(screen.getByLabelText("Mil palavras, desbloqueada")).toBeOnTheScreen();
});

test.each([
  ["first-text", 1, 0, "Primeira leitura, bloqueada, 0 de 1 texto"],
  ["goal-7", 7, 2, "Primeira leitura, bloqueada, 2 de 7 dias com meta"],
  ["streak-3", 3, 1, "Primeira leitura, bloqueada, 1 de 3 dias seguidos"],
])("unidade de %s no rótulo", async (id, target, current, label) => {
  await render(
    <AchievementBadge
      achievement={{ id, title: "Primeira leitura", icon: "book-outline", target, current, unlocked: false }}
    />,
  );
  expect(screen.getByLabelText(label)).toBeOnTheScreen();
});

test("ícone desconhecido cai na medalha genérica", () => {
  expect(achievementIcon("flame")).toBe("flame");
  expect(achievementIcon("nao-existe")).toBe("ribbon-outline");
});
