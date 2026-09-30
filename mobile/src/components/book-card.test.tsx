import { fireEvent, render, screen } from "@testing-library/react-native";

import { BookCard } from "./book-card";

const BOOK = {
  title: "The Old Man and the Sea",
  word_count: 26_500,
  words_read: 1_250,
  progress: 4,
  chapter_count: 12,
  page_count: 127,
};

test("mostra palavras em pt-BR, % lido e tamanho; o card inteiro abre o livro", async () => {
  const onPress = jest.fn();
  await render(<BookCard book={BOOK} onPress={onPress} />);

  expect(screen.getByText("The Old Man and the Sea")).toBeOnTheScreen();
  expect(screen.getByText("1.250 de 26.500 palavras")).toBeOnTheScreen();
  expect(screen.getByText("4% lido")).toBeOnTheScreen();
  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 4 });
  expect(screen.getByText("12 capítulos · 127 páginas")).toBeOnTheScreen();

  await fireEvent.press(
    screen.getByRole("button", {
      name: "The Old Man and the Sea, 1.250 de 26.500 palavras, 4% lido, 12 capítulos · 127 páginas",
    }),
  );
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("sem progresso não mostra barra nem % lido; singular em capítulo e página", async () => {
  await render(
    <BookCard
      book={{ ...BOOK, words_read: 0, progress: 0, chapter_count: 1, page_count: 1 }}
      onPress={jest.fn()}
    />,
  );

  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(screen.queryByText(/% lido/)).not.toBeOnTheScreen();
  expect(screen.getByText("1 capítulo · 1 página")).toBeOnTheScreen();
  expect(
    screen.getByLabelText("The Old Man and the Sea, 0 de 26.500 palavras, 1 capítulo · 1 página"),
  ).toBeOnTheScreen();
});
