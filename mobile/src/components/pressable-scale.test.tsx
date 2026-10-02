import { fireEvent, render, screen } from "@testing-library/react-native";

import { AppText } from "./app-text";
import { PressableScale } from "./pressable-scale";

test("style em função recebe pressed (a cor de pressed continua) e onPress é chamado", async () => {
  const onPress = jest.fn();
  await render(
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? "red" : "white" })}
    >
      <AppText>Ok</AppText>
    </PressableScale>,
  );
  const button = screen.getByRole("button");
  expect(button).toHaveStyle({ backgroundColor: "white" });

  await fireEvent(button, "pressIn");
  expect(button).toHaveStyle({ backgroundColor: "red" });

  await fireEvent(button, "pressOut");
  expect(button).toHaveStyle({ backgroundColor: "white" });

  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});
