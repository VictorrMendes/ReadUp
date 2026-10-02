import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { CompletionScreen, completionTitle, milestoneNote } from "./completion-screen";

jest.mock("@/lib/haptics", () => ({ haptic: { tap: jest.fn(), select: jest.fn(), success: jest.fn() } }));
const mockHidden = { value: false };
jest.mock("@/lib/streak-visibility", () => ({ useStreakHidden: () => mockHidden.value }));

const GAINS = {
  xp: 64,
  words: 640,
  goalMet: true,
  streakUp: true,
  streak: 13,
  achievements: [
    { id: "first-text", title: "Primeira leitura", icon: "book-outline" },
    { id: "goal-1", title: "Meta cumprida", icon: "flag-outline" },
    { id: "words-1k", title: "Mil palavras", icon: "reader-outline" },
  ],
};
const GOAL = { target: 500, words_today: 960, remaining: 0, completed: true };

test.each([
  [7, true, 0, "7 dias seguidos!"], // marco quando a ofensiva subiu nesta leitura
  [66, true, 0, "66 dias seguidos!"], // tempo médio para um hábito se firmar
  [7, false, 0, "Mais um texto lido!"], // ofensiva já mantida antes: sem marco
  [5, true, 0, "Mais um texto lido!"],
  [5, true, 0.5, "Mandou bem!"],
  [5, true, 0.99, "Leitura concluída"],
])("completionTitle(%p, subiu %p, sorteio %p) = %s", (streak, streakUp, pick, title) => {
  expect(completionTitle(streak, streakUp, pick)).toBe(title);
});

test.each([
  [66, "66 dias: o tempo médio para um hábito se firmar."],
  [7, "Uma semana inteira lendo em inglês."],
  [13, null],
])("milestoneNote(%p)", (streak, note) => {
  expect(milestoneNote(streak)).toBe(note);
});

function renderScreen(
  onPrimary = jest.fn(),
  onSecondary = jest.fn(),
  onClose = jest.fn(),
  { goal = GOAL, onFinishForToday }: { goal?: typeof GOAL; onFinishForToday?: () => void } = {},
) {
  return render(
    <CompletionScreen
      visible
      onClose={onClose}
      articleTitle="The science of a good night's sleep"
      minutes={6}
      gains={GAINS}
      goal={goal}
      onFinishForToday={onFinishForToday}
      longestStreak={21}
      primaryAction={{ label: "Próximo texto", onPress: onPrimary }}
      secondaryAction={{ label: "Voltar ao Explorar", onPress: onSecondary }}
    />,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
  mockHidden.value = false;
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
  // reduzir movimento: a meta fica verde, mas sem confete
  expect(screen.queryByTestId("confetti")).not.toBeOnTheScreen();
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

test("meta cumprida: 'Terminar por hoje' leva ao 'Até amanhã' e dele ao início", async () => {
  const onFinish = jest.fn();
  await renderScreen(jest.fn(), jest.fn(), jest.fn(), { onFinishForToday: onFinish });

  await fireEvent.press(screen.getByRole("button", { name: "Terminar por hoje" }));
  expect(screen.getByText("Até amanhã!")).toBeOnTheScreen();
  expect(screen.getByText(/ofensiva de 13 dias garantida/)).toBeOnTheScreen();
  expect(onFinish).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole("button", { name: "Voltar ao início" }));
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("meta ainda aberta: sem 'Terminar por hoje'", async () => {
  const open = { target: 2000, words_today: 960, remaining: 1040, completed: false };
  await renderScreen(jest.fn(), jest.fn(), jest.fn(), { goal: open, onFinishForToday: jest.fn() });

  expect(screen.getByText("Faltam 1.040 palavras")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Terminar por hoje" })).not.toBeOnTheScreen();
});

test("ofensiva escondida no Perfil: sem cartão nem marco de ofensiva", async () => {
  mockHidden.value = true;
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  await renderScreen();

  await waitFor(() => expect(screen.getByText("+64")).toBeOnTheScreen());
  expect(screen.queryByText(/de ofensiva/)).not.toBeOnTheScreen();
  expect(screen.getByText("Meta de hoje cumprida")).toBeOnTheScreen(); // a meta continua
});
