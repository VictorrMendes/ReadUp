import { render, screen } from "@testing-library/react-native";

import { StreakCard } from "./streak-card";

test("ativa hoje: dias, legenda de mantida e recorde maior", async () => {
  await render(<StreakCard current={3} longest={7} activeToday />);

  expect(screen.getByText("3 dias")).toBeOnTheScreen();
  expect(screen.getByText("Ofensiva mantida hoje")).toBeOnTheScreen();
  expect(screen.getByText("Recorde: 7 dias")).toBeOnTheScreen();
  expect(
    screen.getByLabelText("Ofensiva de 3 dias. Ofensiva mantida hoje. Recorde: 7 dias"),
  ).toBeOnTheScreen();
});

test("não ativa com dias: pede a meta de hoje para manter", async () => {
  await render(<StreakCard current={3} longest={3} activeToday={false} />);

  expect(screen.getByText("3 dias")).toBeOnTheScreen();
  expect(screen.getByText("Cumpra a meta de hoje para manter")).toBeOnTheScreen();
  expect(screen.queryByText(/Recorde/)).not.toBeOnTheScreen(); // recorde igual não aparece
  expect(
    screen.getByLabelText("Ofensiva de 3 dias. Cumpra a meta de hoje para manter"),
  ).toBeOnTheScreen();
});

test("zerada: pede a meta de hoje para começar e mostra o recorde", async () => {
  await render(<StreakCard current={0} longest={1} activeToday={false} />);

  expect(screen.getByText("0 dias")).toBeOnTheScreen();
  expect(screen.getByText("Cumpra a meta de hoje para começar")).toBeOnTheScreen();
  expect(screen.getByText("Recorde: 1 dia")).toBeOnTheScreen();
  expect(
    screen.getByLabelText("Ofensiva de 0 dias. Cumpra a meta de hoje para começar. Recorde: 1 dia"),
  ).toBeOnTheScreen();
});

test("singular: 1 dia", async () => {
  await render(<StreakCard current={1} longest={1} activeToday />);

  expect(screen.getByText("1 dia")).toBeOnTheScreen();
  expect(screen.getByLabelText("Ofensiva de 1 dia. Ofensiva mantida hoje")).toBeOnTheScreen();
});
