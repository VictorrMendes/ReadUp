import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { useReduceMotion } from "./use-reduce-motion";

let emit: (enabled: boolean) => void = () => {};
const remove = jest.fn();

beforeEach(() => {
  remove.mockClear();
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_, handler) => {
    emit = handler as unknown as (enabled: boolean) => void;
    return { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>;
  });
});

afterEach(() => jest.restoreAllMocks());

test("começa desconhecido (null) e assume o valor do sistema", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);

  const { result } = await renderHook(() => useReduceMotion());

  await waitFor(() => expect(result.current).toBe(true));
});

test("acompanha a troca com o app aberto e remove o listener ao desmontar", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  const { result, unmount } = await renderHook(() => useReduceMotion());
  await waitFor(() => expect(result.current).toBe(false));

  await act(async () => emit(true));
  expect(result.current).toBe(true);

  await unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

test("falha ao consultar vira false (anima normalmente)", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockRejectedValue(new Error("x"));

  const { result } = await renderHook(() => useReduceMotion());

  await waitFor(() => expect(result.current).toBe(false));
});
