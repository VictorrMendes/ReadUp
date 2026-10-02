import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { haptic } from "./haptics";

const impact = jest.mocked(Haptics.impactAsync);
const notification = jest.mocked(Haptics.notificationAsync);

afterEach(() => {
  jest.clearAllMocks();
});

test("cada momento usa a háptica certa", () => {
  haptic.light();
  haptic.medium();
  haptic.success();

  expect(impact).toHaveBeenNthCalledWith(1, Haptics.ImpactFeedbackStyle.Light);
  expect(impact).toHaveBeenNthCalledWith(2, Haptics.ImpactFeedbackStyle.Medium);
  expect(notification).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});

test("falha do motor é ignorada (háptica é bônus)", async () => {
  impact.mockRejectedValueOnce(new Error("sem motor"));

  expect(() => haptic.light()).not.toThrow();
  await Promise.resolve();
});

test("na web não vibra", () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  try {
    haptic.light();
    expect(impact).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  }
});
