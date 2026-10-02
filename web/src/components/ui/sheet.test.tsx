import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Sheet } from "./sheet";

afterEach(cleanup);

function Panel({ onClose }: { onClose: () => void }) {
  return (
    <Sheet open onClose={onClose} label="Painel">
      <button type="button">Primeiro</button>
      <button type="button">Último</button>
    </Sheet>
  );
}

test("render novo (onClose novo) não puxa o foco de volta para o painel", () => {
  const { rerender } = render(<Panel onClose={() => {}} />);
  screen.getByText("Último").focus();
  rerender(<Panel onClose={() => {}} />);
  expect(document.activeElement).toBe(screen.getByText("Último"));
});

test("Esc chama o onClose mais recente", () => {
  const first = vi.fn();
  const latest = vi.fn();
  const { rerender } = render(<Panel onClose={first} />);
  rerender(<Panel onClose={latest} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(first).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledTimes(1);
});

test("Tab no último item volta para o primeiro (foco preso no painel)", () => {
  render(<Panel onClose={() => {}} />);
  const buttons = screen.getByRole("dialog").querySelectorAll("button");
  const last = buttons[buttons.length - 1];
  last.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(document.activeElement).toBe(buttons[0]);
});
