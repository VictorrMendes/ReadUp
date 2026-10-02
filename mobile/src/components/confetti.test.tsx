import { render, screen } from "@testing-library/react-native";

import { Confetti } from "./confetti";

test("cai quando ativo e com animação", async () => {
  await render(<Confetti active animate random={() => 0.5} />);
  expect(screen.getByTestId("confetti", { includeHiddenElements: true })).toBeOnTheScreen();
});

test.each([
  [false, true],
  [true, false], // reduzir movimento: nada cai
])("não aparece com active=%p animate=%p", async (active, animate) => {
  await render(<Confetti active={active} animate={animate} />);
  expect(screen.queryByTestId("confetti", { includeHiddenElements: true })).not.toBeOnTheScreen();
});
