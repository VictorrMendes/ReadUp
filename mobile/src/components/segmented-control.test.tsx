import { fireEvent, render, screen } from "@testing-library/react-native";

import { SegmentedControl } from "./segmented-control";

const OPTIONS = [
  { value: "texts", label: "Para você" },
  { value: "books", label: "Meus livros" },
] as const;

test("abas: marca a selecionada e chama onChange ao tocar em outra", async () => {
  const onChange = jest.fn();
  await render(
    <SegmentedControl
      options={[...OPTIONS]}
      value="texts"
      onChange={onChange}
      accessibilityLabel="Seção"
    />,
  );

  expect(screen.getByRole("tab", { name: "Para você" })).toBeSelected();
  expect(screen.getByRole("tab", { name: "Meus livros" })).not.toBeSelected();

  await fireEvent.press(screen.getByRole("tab", { name: "Meus livros" }));

  expect(onChange).toHaveBeenCalledWith("books");
});
