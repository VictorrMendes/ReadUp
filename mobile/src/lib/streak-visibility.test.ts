import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";

import { setStreakHidden, useStreakHidden } from "./streak-visibility";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue("1"),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

test("lê do aparelho uma vez e a troca vale em todas as telas abertas", async () => {
  const home = await renderHook(() => useStreakHidden());
  await waitFor(() => expect(home.result.current).toBe(true));

  const profile = await renderHook(() => useStreakHidden());
  expect(profile.result.current).toBe(true); // já em memória
  expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);

  await act(() => setStreakHidden(false));

  expect(home.result.current).toBe(false);
  expect(profile.result.current).toBe(false);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith("readup.hide_streak", "0");
});
