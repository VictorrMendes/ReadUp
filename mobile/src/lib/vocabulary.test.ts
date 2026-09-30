import { sentenceOf, tokenize } from "./vocabulary";

const PARAGRAPH =
  'She said: "Don\'t worry!" The well-known café opened in 1999, and 3 cats came. Is it far?';

test("tokenize preserva todo o texto original", () => {
  for (const text of [PARAGRAPH, "", "   ", "...", "one", " two  spaces ", "It’s fine — really."]) {
    expect(
      tokenize(text)
        .map((piece) => piece.text)
        .join(""),
    ).toBe(text);
  }
});

test("contração e hifenizada são uma palavra só, em minúsculas", () => {
  const words = tokenize(PARAGRAPH).map((piece) => piece.word);

  expect(words).toContain("don't");
  expect(words).toContain("well-known");
  expect(words).toContain("café");
  expect(words).toContain("she");
  expect(tokenize("It’s").map((piece) => piece.word)).toEqual(["it's"]);
});

test("pontuação, espaços e números não são tocáveis", () => {
  const untouchable = tokenize(PARAGRAPH)
    .filter((piece) => piece.word === null)
    .map((piece) => piece.text);

  expect(untouchable).toContain(" 1999, ");
  expect(untouchable).toContain(" 3 ");
  expect(untouchable).toContain('!" ');
  expect(tokenize("42 - ...")).toEqual([{ text: "42 - ...", word: null }]);
});

test("sentenceOf devolve a frase que contém a palavra", () => {
  const pieces = tokenize(PARAGRAPH);
  const indexOf = (word: string) => pieces.findIndex((piece) => piece.word === word);

  expect(sentenceOf(PARAGRAPH, indexOf("worry"))).toBe('She said: "Don\'t worry!');
  expect(sentenceOf(PARAGRAPH, indexOf("café"))).toBe(
    '" The well-known café opened in 1999, and 3 cats came.',
  );
  expect(sentenceOf(PARAGRAPH, indexOf("far"))).toBe("Is it far?");
  expect(sentenceOf("No punctuation here", 2)).toBe("No punctuation here");
});

test("sentenceOf corta em 300 caracteres", () => {
  const long = `${"word ".repeat(100)}end.`;

  const sentence = sentenceOf(long, 0);

  expect(sentence).toHaveLength(300);
  expect(long.startsWith(sentence)).toBe(true);
});
