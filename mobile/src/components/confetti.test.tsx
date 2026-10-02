import { render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { Confetti } from "./confetti";

afterEach(() => jest.restoreAllMocks());

test("cai quando o sistema não pede menos movimento", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  await render(<Confetti />);

  await waitFor(() =>
    expect(screen.getByTestId("confetti", { includeHiddenElements: true })).toBeOnTheScreen(),
  );
});

test("com reduzir movimento, nada cai", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  await render(<Confetti />);

  await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
  expect(screen.queryByTestId("confetti", { includeHiddenElements: true })).not.toBeOnTheScreen();
});
