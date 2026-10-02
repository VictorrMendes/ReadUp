import { fireEvent, render, screen } from "@testing-library/react-native";

import { DEFAULT_SETTINGS, FONT_SIZES } from "@/lib/reader-settings";

import { ReaderSettingsSheet } from "./reader-settings-sheet";

function setup(settings = DEFAULT_SETTINGS) {
  const onChange = jest.fn();
  const view = render(
    <ReaderSettingsSheet visible settings={settings} onChange={onChange} onClose={jest.fn()} />,
  );
  return { onChange, view };
}

test("muda tamanho, fonte e tema", async () => {
  const { onChange, view } = setup();
  await view;

  await fireEvent.press(screen.getByRole("button", { name: "Aumentar texto" }));
  expect(onChange).toHaveBeenLastCalledWith({ sizeIndex: DEFAULT_SETTINGS.sizeIndex + 1 });

  await fireEvent.press(screen.getByRole("tab", { name: "Sem serifa" }));
  expect(onChange).toHaveBeenLastCalledWith({ font: "sans" });

  expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked();
  await fireEvent.press(screen.getByRole("radio", { name: "Escuro" }));
  expect(onChange).toHaveBeenLastCalledWith({ theme: "dark" });
});

test("no menor tamanho, diminuir fica desativado", async () => {
  const { view } = setup({ ...DEFAULT_SETTINGS, sizeIndex: 0 });
  await view;

  expect(screen.getByRole("button", { name: "Diminuir texto" })).toBeDisabled();
  expect(screen.getByText(String(FONT_SIZES[0]))).toBeTruthy();
});
