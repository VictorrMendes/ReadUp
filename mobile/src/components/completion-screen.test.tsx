import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { CompletionScreen, completionTitle } from "./completion-screen";

const GAINS = {
  xp: 64,
  words: 640,
  goalMet: true,
  streak: 13,
  achievements: [
    { id: "first-text", title: "Primeira leitura", icon: "book-outline" },
    { id: "goal-1", title: "Meta cumprida", icon: "flag-outline" },
    { id: "words-1k", title: "Mil palavras", icon: "reader-outline" },
  ],
};
const GOAL = { target: 500, words_today: 960, remaining: 0, completed: true };

test.each([
  [7, true, 0, "7 dias seguidos!"], // marco de ofensiva no dia em que a meta virou
  [7, false, 0, "Mais um texto lido!"], // sem meta hoje, sem marco
  [5, true, 0, "Mais um texto lido!"],
  [5, true, 0.5, "Mandou bem!"],
  [5, true, 0.99, "Leitura concluída"],
])("completionTitle(%p, meta %p, sorteio %p) = %s", (streak, goalMet, pick, title) => {
  expect(completionTitle(streak, goalMet, pick)).toBe(title);
});

function renderScreen(onPrimary = jest.fn(), onSecondary = jest.fn(), onClose = jest.fn()) {
  return render(
    <CompletionScreen
      visible
      onClose={onClose}
      articleTitle="The science of a good night's sleep"
      minutes={6}
      gains={GAINS}
      goal={GOAL}
      longestStreak={21}
      primaryAction={{ label: "Próximo texto", onPress: onPrimary }}
      secondaryAction={{ label: "Voltar ao Explorar", onPress: onSecondary }}
    />,
  );
}

afterEach(() => jest.restoreAllMocks());

test("com reduzir movimento mostra tudo no valor final e anuncia uma vez", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  await renderScreen();

  await waitFor(() => expect(screen.getByText("+64")).toBeOnTheScreen());
  expect(screen.getByText("640")).toBeOnTheScreen();
  expect(screen.getByText("6 min")).toBeOnTheScreen();
  expect(screen.getByText("The science of a good night's sleep")).toBeOnTheScreen();
  expect(screen.getByText("Meta de hoje cumprida")).toBeOnTheScreen();
  expect(screen.getByText("960 / 500")).toBeOnTheScreen();
  expect(screen.getByText("+1 hoje · faltam 8 dias para o recorde")).toBeOnTheScreen();
  // no máximo 2 cartões de conquista e "+N" para o resto
  expect(screen.getByText("Primeira leitura")).toBeOnTheScreen();
  expect(screen.getByText("Meta cumprida")).toBeOnTheScreen();
  expect(screen.queryByText("Mil palavras")).not.toBeOnTheScreen();
  expect(screen.getByText("+1 conquista")).toBeOnTheScreen();
  expect(announce).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith(
    "Leitura concluída. Mais 64 pontos de experiência. 640 palavras. Meta de hoje cumprida. " +
      "Ofensiva: 13 dias. Conquista: Primeira leitura, Meta cumprida, Mil palavras",
  );
});

test("ações do rodapé e fechar", async () => {
  const onPrimary = jest.fn();
  const onSecondary = jest.fn();
  const onClose = jest.fn();
  await renderScreen(onPrimary, onSecondary, onClose);

  await fireEvent.press(screen.getByRole("button", { name: "Próximo texto" }));
  await fireEvent.press(screen.getByRole("button", { name: "Voltar ao Explorar" }));
  await fireEvent.press(screen.getByLabelText("Fechar"));

  expect([onPrimary, onSecondary, onClose].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
});
