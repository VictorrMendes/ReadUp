import { render, screen, within } from "@testing-library/react-native";

import { WeekStrip } from "./week-strip";

// segunda 09/03 a domingo 15/03/2026 (domingo = hoje); [dia, leu o mínimo, bateu a meta]
const DAYS = (
  [
    ["2026-03-09", true, true],
    ["2026-03-10", true, false],
    ["2026-03-11", false, false],
    ["2026-03-12", true, true],
    ["2026-03-13", true, true],
    ["2026-03-14", true, false],
    ["2026-03-15", false, false],
  ] as const
).map(([day, streak_kept, goal_met]) => ({ day, words_read: 0, xp: 0, goal_met, streak_kept }));

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

test("dia mantido com check laranja, meta com check verde, hoje pendente tracejado, dia sem leitura vazio", async () => {
  await render(<WeekStrip days={DAYS} />);

  expect(screen.getAllByTestId("day-met")).toHaveLength(3);
  expect(screen.getAllByTestId("day-kept")).toHaveLength(2);
  expect(screen.getAllByTestId("day-missed")).toHaveLength(1);
  const today = screen.getByTestId("day-2026-03-15");
  expect(within(today).getByTestId("day-pending")).toHaveStyle({ borderStyle: "dashed" });
  expect(within(today).getByText("D")).toHaveStyle({ fontFamily: "Inter_700Bold" });
  expect(
    screen.getByLabelText("Últimos 7 dias: leu em 5, meta batida em 3; hoje pendente"),
  ).toBeOnTheScreen();
});

test("hoje mantido (sem meta): check laranja em hoje e rótulo 'hoje mantida'", async () => {
  const done = DAYS.map((d, i) => (i === 6 ? { ...d, streak_kept: true } : d));
  await render(<WeekStrip days={done} />);

  expect(within(screen.getByTestId("day-2026-03-15")).getByTestId("day-kept")).toBeOnTheScreen();
  expect(screen.queryByTestId("day-pending")).not.toBeOnTheScreen();
  expect(
    screen.getByLabelText("Últimos 7 dias: leu em 6, meta batida em 3; hoje mantida"),
  ).toBeOnTheScreen();
});
