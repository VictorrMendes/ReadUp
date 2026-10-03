import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Completion, completionTitle, milestoneNote } from "./completion";

vi.mock("next/image", () => ({ default: () => null }));

const GAINS = { xp: 40, words: 400, goalMet: true, streakUp: true, streak: 7, achievements: [] };
// antes desta leitura: 300 de 500; depois: 700 (cruza a meta)
const CROSSING = { target: 500, words_today: 700, remaining: 0, completed: true };

function renderCompletion(props: Partial<Parameters<typeof Completion>[0]> = {}) {
  return render(
    <Completion
      articleTitle="Texto"
      minutes={4}
      gains={GAINS}
      goal={CROSSING}
      longestStreak={10}
      primary={{ label: "Próximo texto", onClick: vi.fn() }}
      secondary={{ label: "Ver mais textos", onClick: vi.fn() }}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test.each([
  [7, "Uma semana inteira lendo em inglês."],
  [66, "66 dias: o tempo médio para um hábito se firmar."],
  [8, null],
])("milestoneNote(%s)", (streak, note) => {
  expect(milestoneNote(streak)).toBe(note);
});

test("66 dias é marco no título", () => {
  expect(completionTitle(66, true, 0)).toBe("66 dias seguidos!");
});

test("meta que vira nesta leitura: anel enche, fica verde e solta confete", () => {
  renderCompletion();

  expect(screen.getByTestId("goal-ring")).toBeInTheDocument();
  expect(screen.getByText("Faltam 0 palavras")).toBeInTheDocument();
  expect(screen.queryByTestId("confetti")).not.toBeInTheDocument();
  expect(screen.getByText("Uma semana inteira lendo em inglês.")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1000));

  expect(screen.getByText("Meta de hoje cumprida")).toBeInTheDocument();
  expect(screen.getByTestId("confetti")).toBeInTheDocument();
});

test("meta já cumprida antes desta leitura: sem confete", () => {
  renderCompletion({
    gains: { ...GAINS, goalMet: false },
    goal: { target: 500, words_today: 1200, remaining: 0, completed: true },
  });

  act(() => vi.advanceTimersByTime(2000));

  expect(screen.getByText("Meta de hoje cumprida")).toBeInTheDocument();
  expect(screen.queryByTestId("confetti")).not.toBeInTheDocument();
});

test("XP e palavras: leitor de tela recebe o valor final", () => {
  renderCompletion();
  expect(screen.getByText("+40", { selector: ".sr-only" })).toBeInTheDocument();
  expect(screen.getByText("400", { selector: ".sr-only" })).toBeInTheDocument();
});

test("Terminar por hoje leva ao até amanhã e depois ao início", () => {
  const onFinish = vi.fn();
  renderCompletion({ onFinishForToday: onFinish });

  fireEvent.click(screen.getByRole("button", { name: "Terminar por hoje" }));
  expect(screen.getByRole("heading", { name: "Até amanhã!" })).toBeInTheDocument();
  expect(screen.getByText(/ofensiva de 7 dias garantida/)).toBeInTheDocument();
  expect(onFinish).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Voltar ao início" }));
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("meta ainda aberta: não oferece terminar por hoje", () => {
  renderCompletion({
    gains: { ...GAINS, goalMet: false },
    goal: { target: 500, words_today: 200, remaining: 300, completed: false },
    onFinishForToday: vi.fn(),
  });

  expect(screen.queryByRole("button", { name: "Terminar por hoje" })).not.toBeInTheDocument();
  expect(screen.getByText("Faltam 300 palavras")).toBeInTheDocument();
});

test("ofensiva escondida no Perfil: sem cartão nem marco de ofensiva", () => {
  localStorage.setItem("readup.hide_streak", "1");
  try {
    renderCompletion();
    expect(screen.queryByText(/de ofensiva/)).not.toBeInTheDocument();
    expect(screen.queryByText("Uma semana inteira lendo em inglês.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toBe("7 dias seguidos!");
  } finally {
    localStorage.removeItem("readup.hide_streak");
  }
});

test("ofensiva já mantida antes (sem +1): sem cartão de ofensiva", () => {
  renderCompletion({ gains: { ...GAINS, streakUp: false } });
  expect(screen.queryByText(/de ofensiva/)).not.toBeInTheDocument();
});
