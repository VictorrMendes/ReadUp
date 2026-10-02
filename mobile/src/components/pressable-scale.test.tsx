import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { PressableScale } from "./pressable-scale";

test("repassa toque e eventos de pressionar", async () => {
  const onPress = jest.fn();
  const onPressIn = jest.fn();
  const onPressOut = jest.fn();
  await render(
    <PressableScale accessibilityRole="button" onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Text>Abrir</Text>
    </PressableScale>,
  );

  const button = screen.getByRole("button");
  await fireEvent(button, "pressIn");
  await fireEvent(button, "pressOut");
  await fireEvent.press(button);

  expect(onPressIn).toHaveBeenCalled();
  expect(onPressOut).toHaveBeenCalled();
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("disabled não chama onPress", async () => {
  const onPress = jest.fn();
  await render(
    <PressableScale accessibilityRole="button" disabled onPress={onPress}>
      <Text>Abrir</Text>
    </PressableScale>,
  );

  await fireEvent.press(screen.getByRole("button"));

  expect(onPress).not.toHaveBeenCalled();
});

test("margens ficam no invólucro e o visual no Pressable (inclusive style como função)", async () => {
  await render(
    <PressableScale
      accessibilityRole="button"
      style={({ pressed }) => ({ marginTop: 8, padding: 4, opacity: pressed ? 0.5 : 1 })}
    >
      <Text>Abrir</Text>
    </PressableScale>,
  );

  const inner = StyleSheet.flatten(screen.getByRole("button").props.style);
  expect(inner).toMatchObject({ padding: 4, opacity: 1 });
  expect(inner.marginTop).toBeUndefined();
});
