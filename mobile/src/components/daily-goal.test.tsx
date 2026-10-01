import { fireEvent, render, screen } from "@testing-library/react-native";

import { DailyGoal, goalAction } from "./daily-goal";

test.each([
  [false, true, "Continuar leitura", "primary"],
  [false, false, "Ler um texto", "primary"],
  [true, true, "Ler mais um", "secondary"],
  [true, false, "Ler mais um", "secondary"],
])("goalAction(cumprida %p, em andamento %p) = %s", (completed, inProgress, label, variant) => {
  expect(goalAction(completed, inProgress)).toEqual({ label, variant });
});

test("aberta: número hero, percentual, minutos para fechar e o botão", async () => {
  const onPress = jest.fn();
  await render(
    <DailyGoal
      target={500}
      wordsToday={320}
      remaining={180}
      completed={false}
      action={{ ...goalAction(false, true), onPress }}
    />,
  );

  expect(screen.getByText("Meta de hoje")).toBeOnTheScreen();
  expect(screen.getByText("64%")).toBeOnTheScreen();
  expect(screen.getByText("320")).toBeOnTheScreen();
  expect(screen.getByText("/ 500 palavras")).toBeOnTheScreen();
  expect(screen.getByText("≈ 1 min de leitura para fechar")).toBeOnTheScreen(); // 180/200 → 1
  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 64 });
  expect(
    screen.getByLabelText(
      "Meta de hoje: 320 de 500 palavras, 64%. Faltam 180 palavras, cerca de 1 min de leitura",
    ),
  ).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Continuar leitura" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("cumprida: extras, sem minutos e botão 'Ler mais um'", async () => {
  await render(
    <DailyGoal
      target={2000}
      wordsToday={2150}
      remaining={0}
      completed
      action={{ ...goalAction(true, false), onPress: jest.fn() }}
    />,
  );

  expect(screen.getByText("2.150")).toBeOnTheScreen();
  expect(screen.getByText("100%")).toBeOnTheScreen();
  expect(screen.getByText("Meta cumprida · +150 extras")).toBeOnTheScreen();
  expect(screen.queryByText(/min de leitura/)).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Ler mais um" })).toBeOnTheScreen();
  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 100 });
});
