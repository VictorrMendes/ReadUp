import * as Haptics from "expo-haptics";

import { haptic } from "./haptics";

// o Jest roda como iOS: impactAsync/notificationAsync (no Android seriam as constantes do sistema)
const impact = jest.mocked(Haptics.impactAsync);
const notification = jest.mocked(Haptics.notificationAsync);
const selection = jest.mocked(Haptics.selectionAsync);

afterEach(() => {
  jest.clearAllMocks();
});

test("cada momento usa a háptica certa (mapa do plan.txt §3)", () => {
  haptic.tap(); // salvar palavra
  haptic.hold(); // segurar para traduzir a frase
  haptic.select(); // aba, chip, opção
  haptic.success(); // meta batida, acerto na revisão

  expect(impact).toHaveBeenNthCalledWith(1, Haptics.ImpactFeedbackStyle.Light);
  expect(impact).toHaveBeenNthCalledWith(2, Haptics.ImpactFeedbackStyle.Medium);
  expect(selection).toHaveBeenCalledTimes(1);
  expect(notification).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});

test("falha do motor é ignorada (háptica é bônus)", async () => {
  impact.mockRejectedValueOnce(new Error("sem motor"));

  expect(() => haptic.tap()).not.toThrow();
  await Promise.resolve();
});
