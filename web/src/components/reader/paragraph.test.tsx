import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Paragraph } from "./paragraph";

afterEach(cleanup);

test("palavra salva reaparece com sublinhado discreto; as outras não", () => {
  render(
    <Paragraph
      text="The House is big. The house is old."
      index={0}
      selectedChunk={null}
      markColor="yellow"
      saved={new Set(["house"])}
      savedColor="rgb(0, 0, 255)"
      style={{}}
      onSelect={vi.fn()}
    />,
  );
  // maiúscula ou minúscula: a palavra salva é a forma normalizada
  for (const word of screen.getAllByText(/^house$/i)) {
    expect(word).toHaveClass("decoration-dotted");
    expect(word).toHaveStyle({ textDecorationColor: "rgb(0, 0, 255)" });
  }
  expect(screen.getAllByText("big")[0]).not.toHaveClass("decoration-dotted");
});
