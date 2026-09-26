import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button } from "./button";

test("chama onPress quando ativo", async () => {
  const onPress = jest.fn();
  await render(<Button title="Entrar" onPress={onPress} />);

  await fireEvent.press(screen.getByRole("button"));

  expect(onPress).toHaveBeenCalledTimes(1);
});

test("loading não chama onPress e expõe busy", async () => {
  const onPress = jest.fn();
  await render(<Button title="Entrar" loading onPress={onPress} />);
  const button = screen.getByRole("button");

  await fireEvent.press(button);

  expect(onPress).not.toHaveBeenCalled();
  expect(button).toBeBusy();
  expect(button).toBeDisabled();
});

test("disabled não chama onPress", async () => {
  const onPress = jest.fn();
  await render(<Button title="Entrar" disabled onPress={onPress} />);
  const button = screen.getByRole("button");

  await fireEvent.press(button);

  expect(onPress).not.toHaveBeenCalled();
  expect(button).toBeDisabled();
  expect(button).not.toBeBusy();
});
