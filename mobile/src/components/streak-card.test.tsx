import { render, screen } from "@testing-library/react-native";

import { StreakCard, streakCaption } from "./streak-card";

test.each([
  [3, 7, true, "de ofensiva · mantida hoje"],
  [3, 3, false, "de ofensiva · leia hoje para manter"],
  [0, 21, false, "Recomece hoje · recorde de 21 dias salvo"],
  [0, 0, false, "de ofensiva · leia hoje para manter"],
])("legenda (%p dias, recorde %p, ativa %p)", (current, longest, active, caption) => {
  expect(streakCaption(current, longest, active)).toBe(caption);
});

test("mostra os dias, a legenda e um rótulo acessível único", async () => {
  await render(<StreakCard current={3} longest={7} activeToday />);

  expect(screen.getByText("3 dias")).toBeOnTheScreen();
  expect(screen.getByText("de ofensiva · mantida hoje")).toBeOnTheScreen();
  expect(
    screen.getByLabelText("Ofensiva de 3 dias. de ofensiva · mantida hoje"),
  ).toBeOnTheScreen();
});

test("singular e recomeço sem culpa", async () => {
  await render(<StreakCard current={1} longest={1} activeToday />);
  expect(screen.getByText("1 dia")).toBeOnTheScreen();

  await render(<StreakCard current={0} longest={1} activeToday={false} />);
  expect(screen.getByText("Recomece hoje · recorde de 1 dia salvo")).toBeOnTheScreen();
});

test("com a semana, mostra a faixa de 7 dias", async () => {
  const week = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"].map(
    (day, i) => ({ day, words_read: 0, xp: 0, goal_met: i < 2 }),
  );
  await render(<StreakCard current={2} longest={2} activeToday={false} week={week} />);

  expect(
    screen.getByLabelText("Últimos 7 dias: meta cumprida em 2; hoje pendente"),
  ).toBeOnTheScreen();
});
