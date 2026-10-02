import { expect, test } from "vitest";

import { chunkParagraph, sentenceOf, sentenceText, tokenize } from "./vocabulary";

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

test("chunkParagraph: cada palavra leva a pontuação em volta e o número da frase", () => {
  const text = '"Hi there," she said. Go now!';
  const chunks = chunkParagraph(text);

  expect(chunks.map((c) => c.text).join("")).toBe(text);
  expect(chunks.map((c) => [c.text, c.word, c.sentence])).toEqual([
    ['"Hi ', "hi", 0],
    ['there," ', "there", 0],
    ["she ", "she", 0],
    ["said. ", "said", 0],
    ["Go ", "go", 1],
    ["now!", "now", 1],
  ]);
  expect(sentenceText(chunks, 1)).toBe("Go now!");
  expect(sentenceText(chunks, 0)).toBe('"Hi there," she said.');
});

test("chunkParagraph: parágrafo sem palavras vira um bloco só, não tocável", () => {
  expect(chunkParagraph("42 - ...")).toEqual([{ text: "42 - ...", word: null, sentence: 0, start: 0, end: 0 }]);
});

test("chunkParagraph: start/end marcam só a palavra, sem pontuação e aspas", () => {
  const chunks = chunkParagraph('"Hi there," she said.');
  expect(chunks.map((c) => c.text.slice(c.start, c.end))).toEqual(["Hi", "there", "she", "said"]);
});

test("chunkParagraph: abreviações, iniciais e números com ponto não terminam a frase", () => {
  const sentences = (text: string) => {
    const chunks = chunkParagraph(text);
    const last = chunks[chunks.length - 1].sentence;
    return Array.from({ length: last + 1 }, (_, i) => sentenceText(chunks, i));
  };
  expect(sentences("Mr. Dursley was the director. He was big.")).toEqual([
    "Mr. Dursley was the director.",
    "He was big.",
  ]);
  expect(sentences("It costs 3.5 dollars. Cheap!")).toEqual(["It costs 3.5 dollars.", "Cheap!"]);
  expect(sentences("Written by J. K. Rowling in the U.S. market.")).toEqual([
    "Written by J. K. Rowling in the U.S. market.",
  ]);
  expect(sentences("It was 1990. Then it rained.")).toEqual(["It was 1990.", "Then it rained."]);
});
