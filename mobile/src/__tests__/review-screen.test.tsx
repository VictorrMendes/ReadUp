import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import ReviewScreen from "@/app/review";
import { answerReview, getReviewQueue } from "@/lib/vocabulary";

// a tela fica em src/app (rota); o teste mora fora para o expo-router não tratá-lo como rota
jest.mock("expo-router", () => ({
  router: { canGoBack: () => true, back: jest.fn(), replace: jest.fn() },
}));
// mesmo objeto a cada render: signOut é dependência do efeito que carrega a fila
const mockAuth = { token: "token", signOut: jest.fn() };
jest.mock("@/lib/auth", () => ({ useAuth: () => mockAuth }));
jest.mock("@/lib/speech", () => ({ speak: jest.fn() }));
jest.mock("@/lib/vocabulary", () => ({
  ...jest.requireActual("@/lib/vocabulary"),
  getReviewQueue: jest.fn(),
  answerReview: jest.fn(),
}));

const queue = jest.mocked(getReviewQueue);
const answer = jest.mocked(answerReview);

beforeEach(() => {
  queue.mockResolvedValue({
    cards: [{ id: 1, word: "house", translation: "casa", context: null, box: 1 }],
    due_total: 1,
    reviewed_today: 0,
    daily_limit: 20,
  });
  answer.mockResolvedValue({
    box: 2,
    due_on: null,
    mastered: false,
    xp_gained: 5,
    reviewed_today: 1,
  });
});

afterEach(() => jest.clearAllMocks());

test("vira o cartão para mostrar a tradução; acerto vibra com sucesso e fecha a sessão", async () => {
  await render(<ReviewScreen />);

  expect(await screen.findByText("house")).toBeOnTheScreen();
  expect(screen.queryByText("casa")).not.toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Mostrar tradução" }));
  // a face troca na metade do giro
  expect(await screen.findByText("casa")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Já sei" }));
  expect(await screen.findByText("Revisão concluída")).toBeOnTheScreen();
  expect(answer).toHaveBeenCalledWith("token", 1, true);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});

test("ainda aprendendo não vibra", async () => {
  await render(<ReviewScreen />);

  await fireEvent.press(await screen.findByRole("button", { name: "Mostrar tradução" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Ainda aprendendo" }));

  // a palavra volta como treino extra no fim da sessão, sem vibrar (sem punição)
  expect(await screen.findByText("Treino extra")).toBeOnTheScreen();
  expect(answer).toHaveBeenCalledWith("token", 1, false);
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});
