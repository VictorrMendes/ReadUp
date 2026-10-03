import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { StreakCard } from "./streak-card";

afterEach(cleanup);

const day = (d: string, streak_kept: boolean, goal_met: boolean) => ({ day: d, words_read: 0, xp: 0, goal_met, streak_kept });

test("escudos e chama dourada com a meta batida hoje", () => {
  render(<StreakCard current={3} longest={7} activeToday goalMetToday freezes={2} />);
  expect(screen.getByText("de ofensiva · meta de hoje batida")).toBeInTheDocument();
  expect(screen.getByText("2 escudos · cobrem dias sem leitura")).toBeInTheDocument();
  expect(screen.getByTestId("gold-flame")).toBeInTheDocument();
});

test("ofensiva quebrada: recomeço sem culpa e total acumulado em destaque, sem escudos", () => {
  render(<StreakCard current={0} longest={12} activeToday={false} freezes={0} wordsTotal={18400} />);
  expect(screen.getByText("Acontece. Recomece hoje · recorde de 12 dias salvo")).toBeInTheDocument();
  expect(screen.getByText("18.400")).toBeInTheDocument();
  expect(screen.queryByText(/escudo/)).not.toBeInTheDocument();
});

test("faixa: laranja para dia com leitura, verde para meta, tracejado para hoje pendente", () => {
  const week = [
    day("2026-03-09", true, true),
    day("2026-03-10", true, false),
    day("2026-03-11", false, false),
    day("2026-03-12", true, false),
    day("2026-03-13", false, false),
    day("2026-03-14", true, true),
    day("2026-03-15", false, false),
  ];
  const { container } = render(<StreakCard current={1} longest={3} activeToday={false} week={week} />);
  const states = [...container.querySelectorAll("[data-state]")].map((el) => el.getAttribute("data-state"));
  expect(states).toEqual(["met", "kept", "missed", "kept", "missed", "met", "pending"]);
  expect(screen.getByRole("img", { name: "Últimos 7 dias: leu em 4, meta batida em 2; hoje pendente" })).toBeInTheDocument();
});
