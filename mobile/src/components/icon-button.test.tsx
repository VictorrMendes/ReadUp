import { fireEvent, render, screen } from "@testing-library/react-native";

import { IconButton } from "./icon-button";

test("expõe o accessibilityLabel e chama onPress", async () => {
  const onPress = jest.fn();
  await render(<IconButton icon="arrow-back" accessibilityLabel="Voltar" onPress={onPress} />);
  const button = screen.getByRole("button", { name: "Voltar" });

  await fireEvent.press(button);

  expect(onPress).toHaveBeenCalledTimes(1);
});
