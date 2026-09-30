import { fireEvent, render, screen } from "@testing-library/react-native";

import { deleteWord, lookupWord, saveWord } from "@/lib/vocabulary";

import { WordPopup } from "./word-popup";

jest.mock("@/lib/vocabulary", () => ({
  ...jest.requireActual("@/lib/vocabulary"),
  lookupWord: jest.fn(),
  saveWord: jest.fn(),
  deleteWord: jest.fn(),
}));

const lookup = jest.mocked(lookupWord);
const save = jest.mocked(saveWord);
const remove = jest.mocked(deleteWord);

const SELECTION = { word: "house", sentence: "The house is big." };
const SAVED = {
  id: 7,
  word: "house",
  translation: "casa",
  context: SELECTION.sentence,
  article_id: 3,
  article_title: "My Morning",
  created_at: "2026-09-30T12:00:00Z",
};

function renderPopup() {
  return render(
    <WordPopup
      selection={SELECTION}
      token="token"
      articleId={3}
      onClose={jest.fn()}
      onUnauthorized={jest.fn()}
    />,
  );
}

// clearAllMocks: resetAllMocks apagaria também os mocks do React Native
afterEach(() => jest.clearAllMocks());

test("carregando: palavra, frase e skeleton da tradução; salvar ainda desabilitado", async () => {
  lookup.mockReturnValue(new Promise(() => {}));
  await renderPopup();

  expect(screen.getByText("house")).toBeOnTheScreen();
  expect(screen.getByText("The house is big.")).toBeOnTheScreen();
  expect(screen.getByLabelText("Carregando tradução")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Salvar palavra" })).toBeDisabled();
  expect(lookup).toHaveBeenCalledWith("token", "house");
});

test("mostra a tradução quando disponível", async () => {
  lookup.mockResolvedValue({ word: "house", translation: "casa", saved: false, saved_id: null });
  await renderPopup();

  expect(await screen.findByText("casa")).toBeOnTheScreen();
  expect(screen.queryByLabelText("Carregando tradução")).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Salvar palavra" })).toBeEnabled();
});

test("tradução indisponível ainda permite salvar, com a frase e o texto de origem", async () => {
  lookup.mockResolvedValue({ word: "house", translation: null, saved: false, saved_id: null });
  save.mockResolvedValue({ ...SAVED, translation: null });
  await renderPopup();

  expect(await screen.findByText("Tradução indisponível no momento")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Salvar palavra" }));

  expect(await screen.findByText("Palavra salva")).toBeOnTheScreen();
  expect(save).toHaveBeenCalledWith("token", {
    word: "house",
    article_id: 3,
    context: "The house is big.",
  });
});

test("palavra já salva mostra 'Palavra salva' e remover volta para salvar", async () => {
  lookup.mockResolvedValue({ word: "house", translation: "casa", saved: true, saved_id: 7 });
  remove.mockResolvedValue(undefined);
  await renderPopup();

  expect(await screen.findByText("Palavra salva")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Salvar palavra" })).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Remover" }));

  expect(await screen.findByRole("button", { name: "Salvar palavra" })).toBeOnTheScreen();
  expect(remove).toHaveBeenCalledWith("token", 7);
  expect(save).not.toHaveBeenCalled(); // remove direto pelo id do lookup
});

test("erro ao salvar mostra aviso e mantém o botão", async () => {
  lookup.mockResolvedValue({ word: "house", translation: "casa", saved: false, saved_id: null });
  save.mockRejectedValue(new TypeError("Network request failed"));
  await renderPopup();

  await fireEvent.press(await screen.findByRole("button", { name: "Salvar palavra" }));

  expect(await screen.findByText("Não foi possível salvar. Tente novamente.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Salvar palavra" })).toBeEnabled();
});
