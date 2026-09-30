import { fireEvent, render, screen } from "@testing-library/react-native";

import { GOAL_OPTIONS } from "@/lib/preferences";

import { OptionList } from "./option-list";

test("grupo de rádio: marca a opção escolhida e chama onChange ao escolher outra", async () => {
  const onChange = jest.fn();
  await render(
    <OptionList options={GOAL_OPTIONS} value={500} onChange={onChange} accessibilityLabel="Meta" />,
  );

  expect(screen.getByRole("radio", { name: /^500 palavras/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /^1\.000 palavras/ })).not.toBeChecked();

  await fireEvent.press(screen.getByText("1.000 palavras"));

  expect(onChange).toHaveBeenCalledWith(1000);
});

test("opções de meta trazem o tempo aproximado a 200 palavras/min", () => {
  expect(GOAL_OPTIONS.map((o) => `${o.label} · ${o.description}`)).toEqual([
    "300 palavras · ~2 min por dia",
    "500 palavras · ~3 min por dia",
    "1.000 palavras · ~5 min por dia",
    "2.000 palavras · ~10 min por dia",
  ]);
});
