import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { GoalRing } from "./goal-ring";

test("desenha o anel e o conteúdo do centro, escondidos do leitor de tela", async () => {
  await render(
    <GoalRing from={0.2} to={0.8} color="#3B3A98">
      <Text>80%</Text>
    </GoalRing>,
  );

  const ring = screen.getByTestId("goal-ring", { includeHiddenElements: true });
  expect(ring).toHaveProp("importantForAccessibility", "no-hide-descendants");
  expect(screen.getByText("80%", { includeHiddenElements: true })).toBeTruthy();
});
