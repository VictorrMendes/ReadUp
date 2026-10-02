import { render, screen } from "@testing-library/react-native";

import { weekday } from "@/lib/format";

import { MAX_BAR_HEIGHT, WeekChart } from "./week-chart";

// segunda 09/03/2026 a domingo 15/03/2026
const DAYS = [
  { day: "2026-03-09", words_read: 320, xp: 82, goal_met: true, streak_kept: true },
  { day: "2026-03-10", words_read: 160, xp: 16, goal_met: false, streak_kept: true },
  { day: "2026-03-11", words_read: 0, xp: 0, goal_met: false, streak_kept: false },
  { day: "2026-03-12", words_read: 80, xp: 8, goal_met: false, streak_kept: true },
  { day: "2026-03-13", words_read: 1, xp: 0, goal_met: false, streak_kept: false },
  { day: "2026-03-14", words_read: 0, xp: 0, goal_met: false, streak_kept: false },
  { day: "2026-03-15", words_read: 320, xp: 82, goal_met: true, streak_kept: true },
];

test.each([
  ["2026-03-09", "Segunda", "S"],
  ["2026-03-10", "Terça", "T"],
  ["2026-03-11", "Quarta", "Q"],
  ["2026-03-12", "Quinta", "Q"],
  ["2026-03-13", "Sexta", "S"],
  ["2026-03-14", "Sábado", "S"],
  ["2026-03-15", "Domingo", "D"],
  ["2024-02-29", "Quinta", "Q"],
])("weekday(%s) = %s", (date, name, letter) => {
  expect(weekday(date)).toEqual({ name, letter });
});

test("barras proporcionais às palavras, dia vazio com traço mínimo", async () => {
  await render(<WeekChart days={DAYS} />);

  const height = (day: string) => screen.getByTestId(`bar-${day}`);
  expect(height("2026-03-09")).toHaveStyle({ height: MAX_BAR_HEIGHT });
  expect(height("2026-03-10")).toHaveStyle({ height: MAX_BAR_HEIGHT / 2 });
  expect(height("2026-03-12")).toHaveStyle({ height: MAX_BAR_HEIGHT / 4 });
  expect(height("2026-03-13")).toHaveStyle({ height: 4 }); // 1 palavra: mínimo visível
  expect(height("2026-03-11")).toHaveStyle({ height: 4 });
});

test("meta cumprida: check acima da barra e rótulo de acessibilidade", async () => {
  await render(<WeekChart days={DAYS} />);

  expect(screen.getByTestId("check-2026-03-09")).toBeOnTheScreen();
  expect(screen.getByTestId("check-2026-03-15")).toBeOnTheScreen();
  expect(screen.queryByTestId("check-2026-03-10")).not.toBeOnTheScreen();
  expect(screen.getByLabelText("Segunda, 320 palavras, meta cumprida")).toBeOnTheScreen();
  expect(screen.getByLabelText("Quarta, 0 palavras")).toBeOnTheScreen();
  expect(screen.getByLabelText("Sexta, 1 palavra")).toBeOnTheScreen();
});

test("rótulos dos dias a partir das datas e resumo acessível", async () => {
  await render(<WeekChart days={DAYS} />);

  expect(screen.getByText("Últimos 7 dias")).toBeOnTheScreen();
  expect(screen.getAllByText(/^[STQD]$/).map((node) => node.props.children)).toEqual([
    "S",
    "T",
    "Q",
    "Q",
    "S",
    "S",
    "D",
  ]);
  expect(
    screen.getByLabelText("Últimos 7 dias: 881 palavras no total; meta cumprida em 2 dias"),
  ).toBeOnTheScreen();
});
