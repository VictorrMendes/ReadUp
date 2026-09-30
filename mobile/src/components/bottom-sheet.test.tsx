import { fireEvent, render, screen } from "@testing-library/react-native";

import { AppText } from "./app-text";
import { BottomSheet } from "./bottom-sheet";

test("visível mostra o conteúdo e fecha ao tocar no fundo", async () => {
  const onClose = jest.fn();
  await render(
    <BottomSheet visible onClose={onClose}>
      <AppText>Conteúdo</AppText>
    </BottomSheet>,
  );

  expect(screen.getByText("Conteúdo")).toBeOnTheScreen();
  // o fundo fica fora da leitura de tela enquanto o painel é modal (accessibilityViewIsModal)
  await fireEvent.press(screen.getByLabelText("Fechar", { includeHiddenElements: true }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("botão voltar do Android (onRequestClose) fecha", async () => {
  const onClose = jest.fn();
  await render(
    <BottomSheet visible onClose={onClose}>
      <AppText>Conteúdo</AppText>
    </BottomSheet>,
  );

  await fireEvent(screen.getByTestId("bottom-sheet"), "requestClose");

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("fechado não mostra o conteúdo", async () => {
  await render(
    <BottomSheet visible={false} onClose={jest.fn()}>
      <AppText>Conteúdo</AppText>
    </BottomSheet>,
  );

  expect(screen.queryByText("Conteúdo")).not.toBeOnTheScreen();
});
