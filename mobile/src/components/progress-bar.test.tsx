import { render, screen } from "@testing-library/react-native";

import { ProgressBar } from "./progress-bar";

test.each([
  [1.5, 100],
  [-1, 0],
  [0.42, 42],
])("value %p → now %p", async (value, now) => {
  await render(<ProgressBar value={value} />);

  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ min: 0, max: 100, now });
});
