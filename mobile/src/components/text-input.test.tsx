import { render, screen } from "@testing-library/react-native";

import { TextInput } from "./text-input";

test("com error mostra a mensagem e a expõe como hint do campo", async () => {
  await render(<TextInput label="Email" error="Email inválido" />);

  expect(screen.getByText("Email inválido")).toBeOnTheScreen();
  expect(screen.getByLabelText("Email").props.accessibilityHint).toBe("Email inválido");
});

test("sem error não mostra mensagem", async () => {
  await render(<TextInput label="Email" />);

  expect(screen.queryByText("Email inválido")).not.toBeOnTheScreen();
});
