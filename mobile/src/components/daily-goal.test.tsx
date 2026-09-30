import { render, screen } from "@testing-library/react-native";

import { DailyGoal } from "./daily-goal";

test("parcial: número em destaque, percentual e quanto falta, em pt-BR", async () => {
  await render(<DailyGoal target={1000} wordsToday={250} remaining={750} completed={false} />);

  expect(screen.getByText("Meta diária")).toBeOnTheScreen();
  expect(screen.getByText("25%")).toBeOnTheScreen();
  expect(screen.getByText("250")).toBeOnTheScreen();
  expect(screen.getByText("/ 1.000 palavras")).toBeOnTheScreen();
  expect(screen.getByText("Faltam 750 palavras")).toBeOnTheScreen();
  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 25 });
  expect(screen.queryByText("Meta de hoje cumprida")).not.toBeOnTheScreen();
  expect(
    screen.getByLabelText("Meta diária: 250 de 1.000 palavras, 25%. Faltam 750 palavras"),
  ).toBeOnTheScreen();
});

test("concluída mostra o estado cumprido", async () => {
  await render(<DailyGoal target={2000} wordsToday={2150} remaining={0} completed />);

  expect(screen.getByText("2.150")).toBeOnTheScreen();
  expect(screen.getByText("100%")).toBeOnTheScreen();
  expect(screen.getByText("Meta de hoje cumprida")).toBeOnTheScreen();
  expect(screen.queryByText(/Faltam/)).not.toBeOnTheScreen();
  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 100 });
});
