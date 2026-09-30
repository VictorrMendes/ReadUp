import { fireEvent, render, screen } from "@testing-library/react-native";

import { ReadingCard } from "./reading-card";

const ARTICLE = {
  title: "The Lost Cat",
  difficulty: "A1" as const,
  category: "Histórias",
  word_count: 148,
  estimated_minutes: 1,
  progress: 0,
  completed: false,
};

test("mostra nível, categoria, título e tempo estimado", async () => {
  await render(<ReadingCard article={ARTICLE} />);

  expect(screen.getByText("The Lost Cat")).toBeOnTheScreen();
  expect(screen.getByText("A1")).toBeOnTheScreen();
  expect(screen.getByText("Histórias")).toBeOnTheScreen();
  expect(screen.getByText("1 min · 148 palavras")).toBeOnTheScreen();
  expect(screen.getByLabelText("The Lost Cat, nível A1, Histórias, 1 minuto")).toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

test("em andamento mostra a barra e o rótulo de % lido", async () => {
  await render(<ReadingCard article={{ ...ARTICLE, progress: 40 }} />);

  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 40 });
  expect(screen.getByText("40% lido")).toBeOnTheScreen();
  expect(
    screen.getByLabelText("The Lost Cat, nível A1, Histórias, 1 minuto, 40% lido"),
  ).toBeOnTheScreen();
});

test("concluído usa o rótulo concluído e não mostra barra", async () => {
  await render(<ReadingCard article={{ ...ARTICLE, progress: 100, completed: true }} />);

  expect(
    screen.getByLabelText("The Lost Cat, nível A1, Histórias, 1 minuto, concluído"),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

test("com onPress vira botão com o mesmo rótulo", async () => {
  const onPress = jest.fn();
  await render(<ReadingCard article={ARTICLE} onPress={onPress} />);

  await fireEvent.press(screen.getByRole("button", { name: /^The Lost Cat, nível A1/ }));

  expect(onPress).toHaveBeenCalledTimes(1);
});

test("notícia mostra a fonte em caption e no rótulo; texto do app não", async () => {
  await render(
    <ReadingCard
      article={{ ...ARTICLE, category: "Notícias", difficulty: "B1", source: "VOA Learning English" }}
    />,
  );

  expect(screen.getByText("VOA Learning English")).toBeOnTheScreen();
  expect(screen.getByText("Notícias")).toBeOnTheScreen();
  expect(
    screen.getByLabelText("The Lost Cat, nível B1, Notícias, VOA Learning English, 1 minuto"),
  ).toBeOnTheScreen();

  await render(<ReadingCard article={{ ...ARTICLE, source: "ReadUp" }} />);
  expect(screen.queryByText("ReadUp")).not.toBeOnTheScreen();
});
