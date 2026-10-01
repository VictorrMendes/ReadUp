import { render, screen, within } from "@testing-library/react-native";

import { WeekStrip } from "./week-strip";

// segunda 09/03 a domingo 15/03/2026 (domingo = hoje)
const DAYS = [
  ["2026-03-09", true],
  ["2026-03-10", true],
  ["2026-03-11", false],
  ["2026-03-12", true],
  ["2026-03-13", true],
  ["2026-03-14", true],
  ["2026-03-15", false],
].map(([day, goal_met]) => ({ day: day as string, words_read: 0, xp: 0, goal_met: goal_met as boolean }));

test("7 dias com a letra de cada um, a partir das datas", async () => {
  await render(<WeekStrip days={DAYS} />);

  expect(screen.getAllByText(/^[STQD]$/).map((n) => n.props.children)).toEqual([
    "S",
    "T",
    "Q",
    "Q",
    "S",
    "S",
    "D",
  ]);
});

test("dias de meta com check, hoje pendente tracejado, dia perdido vazio", async () => {
  await render(<WeekStrip days={DAYS} />);

  expect(screen.getAllByTestId("day-met")).toHaveLength(5);
  expect(screen.getAllByTestId("day-missed")).toHaveLength(1);
  const today = screen.getByTestId("day-2026-03-15");
  expect(within(today).getByTestId("day-pending")).toHaveStyle({ borderStyle: "dashed" });
  expect(within(today).getByText("D")).toHaveStyle({ fontFamily: "Inter_700Bold" });
  expect(
    screen.getByLabelText("Últimos 7 dias: meta cumprida em 5; hoje pendente"),
  ).toBeOnTheScreen();
});

test("hoje cumprido: check em hoje e rótulo 'hoje cumprida'", async () => {
  const done = DAYS.map((d, i) => (i === 6 ? { ...d, goal_met: true } : d));
  await render(<WeekStrip days={done} />);

  expect(within(screen.getByTestId("day-2026-03-15")).getByTestId("day-met")).toBeOnTheScreen();
  expect(screen.queryByTestId("day-pending")).not.toBeOnTheScreen();
  expect(
    screen.getByLabelText("Últimos 7 dias: meta cumprida em 6; hoje cumprida"),
  ).toBeOnTheScreen();
});
