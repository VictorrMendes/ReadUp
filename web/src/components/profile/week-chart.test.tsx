import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { barHeight, WeekChart } from "./week-chart";

describe("WeekChart", () => {
  it("altura proporcional ao maior dia, com traço mínimo", () => {
    expect(barHeight(0, 100)).toBe(4);
    expect(barHeight(100, 100)).toBe(96);
    expect(barHeight(50, 100)).toBe(48);
    expect(barHeight(1, 1000)).toBe(4);
  });

  it("descreve cada dia e o total (meta não depende só da cor)", () => {
    render(
      <WeekChart
        days={[
          { day: "2026-09-30", words_read: 0, xp: 0, goal_met: false, streak_kept: false },
          { day: "2026-10-01", words_read: 520, xp: 10, goal_met: true, streak_kept: true },
        ]}
      />,
    );
    expect(screen.getByText("Últimos 2 dias")).toBeTruthy();
    expect(screen.getByText(/520 palavras · meta em 1 dia/)).toBeTruthy();
    expect(screen.getByLabelText(/quinta-feira, 520 palavras, meta cumprida/)).toBeTruthy();
    expect(screen.getByLabelText(/quarta-feira, 0 palavras$/)).toBeTruthy();
  });
});
