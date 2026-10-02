import { render, screen } from "@testing-library/react-native";

import { StreakCard, freezesLabel, streakCaption } from "./streak-card";

test.each([
  [3, 7, true, false, "de ofensiva · mantida hoje"],
  [3, 7, true, true, "de ofensiva · meta de hoje batida"],
  [3, 3, false, false, "de ofensiva · um texto curto hoje mantém"],
  [0, 21, false, false, "Acontece. Recomece hoje · recorde de 21 dias salvo"],
  [0, 0, false, false, "de ofensiva · um texto curto hoje mantém"],
])("legenda (%p dias, recorde %p, ativa %p, meta %p)", (current, longest, active, goal, caption) => {
  expect(streakCaption(current, longest, active, goal)).toBe(caption);
});

test.each([
  [2, "2 escudos · cobrem dias sem leitura"],
  [1, "1 escudo · cobrem dias sem leitura"],
  [0, "Sem escudos: leia hoje para manter"],
])("escudos %p", (freezes, label) => {
  expect(freezesLabel(freezes)).toBe(label);
});

test("mostra os dias, a legenda, os escudos e um rótulo acessível único", async () => {
  await render(<StreakCard current={3} longest={7} activeToday freezes={2} />);

  expect(screen.getByText("3 dias")).toBeOnTheScreen();
  expect(screen.getByText("de ofensiva · mantida hoje")).toBeOnTheScreen();
  expect(screen.getByText("2 escudos · cobrem dias sem leitura")).toBeOnTheScreen();
  expect(
    screen.getByLabelText(
      "Ofensiva de 3 dias. de ofensiva · mantida hoje. 2 escudos · cobrem dias sem leitura",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId("gold-flame")).not.toBeOnTheScreen();
});

test("meta batida hoje: chama dourada", async () => {
  await render(<StreakCard current={3} longest={7} activeToday goalMetToday />);

  expect(screen.getByTestId("gold-flame")).toBeOnTheScreen();
});

test("ofensiva quebrada: recomeço sem culpa, total acumulado em destaque e sem escudos", async () => {
  await render(
    <StreakCard current={0} longest={12} activeToday={false} freezes={0} wordsTotal={18400} />,
  );

  expect(screen.getByText("Acontece. Recomece hoje · recorde de 12 dias salvo")).toBeOnTheScreen();
  expect(screen.getByText("18.400")).toBeOnTheScreen();
  expect(screen.queryByText(/escudo/)).not.toBeOnTheScreen();
  expect(
    screen.getByLabelText(
      "Ofensiva de 0 dias. Acontece. Recomece hoje · recorde de 12 dias salvo. " +
        "Você já leu 18.400 palavras",
    ),
  ).toBeOnTheScreen();
});

test("com a semana, mostra a faixa de 7 dias", async () => {
  const week = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"].map(
    (day, i) => ({ day, words_read: 0, xp: 0, goal_met: i < 2, streak_kept: i < 3 }),
  );
  await render(<StreakCard current={3} longest={3} activeToday={false} week={week} />);

  expect(
    screen.getByLabelText("Últimos 7 dias: leu em 3, meta batida em 2; hoje pendente"),
  ).toBeOnTheScreen();
});
