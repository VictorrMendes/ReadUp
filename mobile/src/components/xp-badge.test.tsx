import { render, screen } from "@testing-library/react-native";

import { XPBadge } from "./xp-badge";

test("total: mostra o XP com rótulo acessível", async () => {
  await render(<XPBadge xp={340} />);

  expect(screen.getByText("340 XP")).toBeOnTheScreen();
  expect(screen.getByLabelText("340 pontos de experiência")).toBeOnTheScreen();
});

test("gain: mostra o ganho com sinal de mais", async () => {
  await render(<XPBadge xp={35} gain />);

  expect(screen.getByText("+35 XP")).toBeOnTheScreen();
  expect(screen.getByLabelText("Mais 35 pontos de experiência")).toBeOnTheScreen();
});

test("formata milhar em pt-BR", async () => {
  await render(<XPBadge xp={1250} />);

  expect(screen.getByText("1.250 XP")).toBeOnTheScreen();
  expect(screen.getByLabelText("1.250 pontos de experiência")).toBeOnTheScreen();
});
