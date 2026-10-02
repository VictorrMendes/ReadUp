import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { AccessibilityInfo } from "react-native";

import { CompletionScreen, completionTitle, milestoneNote } from "./completion-screen";

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

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

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

test.each([
  [7, "Uma semana inteira lendo em inglês."],
  [66, "66 dias: o tempo médio para um hábito se firmar."],
  [100, "100 dias de leitura. Poucos chegam aqui."],
  [8, null],
])("milestoneNote(%p)", (streak, note) => {
  expect(milestoneNote(streak)).toBe(note);
});

test("66 dias também é marco no título", () => {
  expect(completionTitle(66, true, 0)).toBe("66 dias seguidos!");
});

test("meta que vira nesta leitura: anel, confete e háptica de sucesso", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  await render(
    <CompletionScreen
      visible
      onClose={jest.fn()}
      articleTitle="Texto"
      minutes={4}
      gains={{ xp: 40, words: 400, goalMet: true, streak: 7, achievements: [] }}
      // antes desta leitura: 300 de 500 (60%); depois: 700 (cruza os 100%)
      goal={{ target: 500, words_today: 700, remaining: 0, completed: true }}
      longestStreak={7}
      primaryAction={null}
      secondaryAction={{ label: "Ver mais textos", onPress: jest.fn() }}
    />,
  );

  expect(screen.getByTestId("goal-ring", { includeHiddenElements: true })).toBeOnTheScreen();
  expect(await screen.findByText("Uma semana inteira lendo em inglês.")).toBeOnTheScreen();
  // tocar na tela pula a sequência: a meta cruza na hora
  await fireEvent(screen.getByText("Texto"), "touchStart");
  expect(await screen.findByText("Meta de hoje cumprida")).toBeOnTheScreen();
  await waitFor(() =>
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success),
  );
});

test("meta já cumprida antes: sem confete nem háptica de novo", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  // 1.200 palavras hoje, 640 desta leitura: a meta de 500 já estava cumprida antes
  await render(
    <CompletionScreen
      visible
      onClose={jest.fn()}
      articleTitle="Texto"
      minutes={4}
      gains={{ ...GAINS, goalMet: false }}
      goal={{ target: 500, words_today: 1200, remaining: 0, completed: true }}
      longestStreak={21}
      primaryAction={null}
      secondaryAction={{ label: "Ver mais textos", onPress: jest.fn() }}
    />,
  );

  await waitFor(() => expect(screen.getByText("Meta de hoje cumprida")).toBeOnTheScreen());
  expect(screen.queryByTestId("confetti", { includeHiddenElements: true })).not.toBeOnTheScreen();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

test("Terminar por hoje mostra o até amanhã e volta ao início", async () => {
  const onFinish = jest.fn();
  await render(
    <CompletionScreen
      visible
      onClose={jest.fn()}
      articleTitle="Texto"
      minutes={4}
      gains={GAINS}
      goal={GOAL}
      longestStreak={21}
      primaryAction={{ label: "Próximo texto", onPress: jest.fn() }}
      secondaryAction={{ label: "Ver mais textos", onPress: jest.fn() }}
      onFinishForToday={onFinish}
    />,
  );

  await fireEvent.press(screen.getByRole("button", { name: "Terminar por hoje" }));
  expect(screen.getByText("Até amanhã!")).toBeOnTheScreen();
  expect(screen.getByText(/ofensiva de 13 dias garantida/)).toBeOnTheScreen();
  expect(onFinish).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole("button", { name: "Voltar ao início" }));
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("sem meta cumprida, não oferece terminar por hoje", async () => {
  await render(
    <CompletionScreen
      visible
      onClose={jest.fn()}
      articleTitle="Texto"
      minutes={4}
      gains={{ ...GAINS, goalMet: false, achievements: [] }}
      goal={{ target: 500, words_today: 200, remaining: 300, completed: false }}
      longestStreak={21}
      primaryAction={{ label: "Próximo texto", onPress: jest.fn() }}
      secondaryAction={{ label: "Ver mais textos", onPress: jest.fn() }}
      onFinishForToday={jest.fn()}
    />,
  );

  expect(screen.queryByRole("button", { name: "Terminar por hoje" })).not.toBeOnTheScreen();
  expect(screen.getByText("Faltam 300 palavras")).toBeOnTheScreen();
});
