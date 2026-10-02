import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AchievementBadge } from "./achievement-badge";

const base = { id: "words-1000", title: "Mil palavras", description: "Leia 1.000 palavras", icon: "book-outline", target: 1000 };

describe("AchievementBadge", () => {
  it("bloqueada mostra progresso", () => {
    render(<ul><AchievementBadge achievement={{ ...base, current: 250, unlocked: false }} /></ul>);
    expect(screen.getByLabelText("Mil palavras, bloqueada, 250 de 1.000 palavras")).toBeTruthy();
    expect(screen.getByText("250 / 1.000")).toBeTruthy();
  });

  it("desbloqueada", () => {
    render(<ul><AchievementBadge achievement={{ ...base, current: 1000, unlocked: true }} /></ul>);
    expect(screen.getByLabelText("Mil palavras, desbloqueada")).toBeTruthy();
    expect(screen.getByText("Desbloqueada")).toBeTruthy();
  });
});
