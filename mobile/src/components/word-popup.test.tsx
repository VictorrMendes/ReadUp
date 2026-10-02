import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

import { ApiError } from "@/lib/api";
import {
  deleteWord,
  lookupWord,
  saveWord,
  splitAround,
  translateSentence,
} from "@/lib/vocabulary";

import { WordPopup } from "./word-popup";

jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));

jest.mock("@/lib/vocabulary", () => ({
  ...jest.requireActual("@/lib/vocabulary"),
  lookupWord: jest.fn(),
  saveWord: jest.fn(),
  deleteWord: jest.fn(),
  translateSentence: jest.fn(),
}));

const lookup = jest.mocked(lookupWord);
const save = jest.mocked(saveWord);
const remove = jest.mocked(deleteWord);
const translate = jest.mocked(translateSentence);

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

  // a palavra aparece no título e destacada dentro da frase
  expect(screen.getByRole("header", { name: "house" })).toBeOnTheScreen();
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
  // salvar é recompensa: toque leve junto com o ícone
  expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
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

test("ouvir a pronúncia fala a palavra em inglês; ouvir a frase fala a frase", async () => {
  lookup.mockResolvedValue({ word: "house", translation: "casa", saved: false, saved_id: null });
  await renderPopup();

  await fireEvent.press(screen.getByRole("button", { name: "Ouvir a pronúncia de house" }));
  expect(Speech.speak).toHaveBeenLastCalledWith("house", { language: "en-US", rate: 0.9 });

  await fireEvent.press(screen.getByRole("button", { name: "Ouvir a frase" }));
  expect(Speech.speak).toHaveBeenLastCalledWith("The house is big.", {
    language: "en-US",
    rate: 0.9,
  });
});

test("destaca a palavra inteira na frase, sem diferenciar maiúsculas", () => {
  expect(splitAround("The House is big.", "house")).toEqual({
    before: "The ",
    match: "House",
    after: " is big.",
  });
  // "household" não conta como "house"
  expect(splitAround("A household. A house.", "house")).toEqual({
    before: "A household. A ",
    match: "house",
    after: ".",
  });
  expect(splitAround("Nothing here.", "house")).toBeNull();
});

test("traduzir a frase da palavra sob demanda", async () => {
  lookup.mockResolvedValue({ word: "house", translation: "casa", saved: false, saved_id: null });
  translate.mockResolvedValue({ text: SELECTION.sentence, translation: "A casa é grande." });
  await renderPopup();

  await fireEvent.press(await screen.findByRole("button", { name: "Traduzir a frase" }));

  expect(await screen.findByText("A casa é grande.")).toBeOnTheScreen();
  expect(translate).toHaveBeenCalledWith("token", 3, "The house is big.");
});

test("frase escolhida (dedo segurado) já abre traduzida; limite do dia vira aviso", async () => {
  translate.mockRejectedValue(new ApiError(429, "limite"));
  await render(
    <WordPopup
      selection={{ word: null, sentence: "The house is big." }}
      token="token"
      articleId={3}
      onClose={jest.fn()}
      onUnauthorized={jest.fn()}
    />,
  );

  expect(screen.getByRole("header", { name: "Frase" })).toBeOnTheScreen();
  expect(
    await screen.findByText("Você atingiu o limite de traduções de frase de hoje. Volte amanhã!"),
  ).toBeOnTheScreen();
  expect(lookup).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Salvar palavra" })).not.toBeOnTheScreen();
});
