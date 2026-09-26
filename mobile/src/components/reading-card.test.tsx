import { render, screen } from "@testing-library/react-native";

import { ReadingCard } from "./reading-card";

const ARTICLE = {
  title: "The Lost Cat",
  difficulty: "A1" as const,
  category: "Histórias",
  word_count: 148,
  estimated_minutes: 1,
};

test("mostra título, nível, categoria e tempo estimado", async () => {
  await render(
    <ReadingCard
      article={{
        title: "The Lost Cat",
        difficulty: "A1",
        category: "Histórias",
        word_count: 148,
        estimated_minutes: 1,
        progress: 0,
        completed: false,
      }}
    />,
  );

  expect(screen.getByText("The Lost Cat")).toBeOnTheScreen();
  expect(screen.getByText("A1")).toBeOnTheScreen();
  expect(screen.getByText("Histórias")).toBeOnTheScreen();
  expect(screen.getByText("1 min · 148 palavras")).toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(screen.queryByText("Concluído")).not.toBeOnTheScreen();
});

test("mostra a barra com o progresso do usuário", async () => {
  await render(<ReadingCard article={{ ...ARTICLE, progress: 40, completed: false }} />);

  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 40 });
  expect(screen.queryByText("Concluído")).not.toBeOnTheScreen();
});

test("texto concluído mostra o badge Concluído", async () => {
  await render(<ReadingCard article={{ ...ARTICLE, progress: 100, completed: true }} />);

  expect(screen.getByText("Concluído")).toBeOnTheScreen();
});
