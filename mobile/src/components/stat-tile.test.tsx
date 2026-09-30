import { render, screen } from "@testing-library/react-native";

import { StatTile } from "./stat-tile";

test("número em pt-BR, rótulo e rótulo acessível único", async () => {
  await render(<StatTile value={3450} label="palavras lidas" />);

  expect(screen.getByText("3.450")).toBeOnTheScreen();
  expect(screen.getByText("palavras lidas")).toBeOnTheScreen();
  expect(screen.getByLabelText("3.450 palavras lidas")).toBeOnTheScreen();
});

test("texto pronto e rótulo acessível próprio", async () => {
  await render(
    <StatTile
      value="2 / 1"
      label="livros iniciados / concluídos"
      accessibilityLabel="2 livros iniciados, 1 concluídos"
    />,
  );

  expect(screen.getByText("2 / 1")).toBeOnTheScreen();
  expect(screen.getByLabelText("2 livros iniciados, 1 concluídos")).toBeOnTheScreen();
});
