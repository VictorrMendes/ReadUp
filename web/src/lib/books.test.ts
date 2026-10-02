import { expect, test } from "vitest";

import { MAX_PDF_BYTES, bookTitle, checkPdf, continueChapter } from "./books";

test("só PDF até 20 MB", () => {
  expect(checkPdf({ name: "a.pdf", size: 10, type: "application/pdf" })).toBeNull();
  expect(checkPdf({ name: "A.PDF", size: 10, type: "" })).toBeNull();
  expect(checkPdf({ name: "a.docx", size: 10, type: "application/msword" })).toBe(
    "Escolha um arquivo PDF.",
  );
  expect(checkPdf({ name: "a.pdf", size: MAX_PDF_BYTES + 1, type: "application/pdf" })).toBe(
    "PDF maior que 20 MB",
  );
});

test("continuar no primeiro capítulo não concluído", () => {
  const ch = (id: number, completed: boolean) => ({
    id, title: "", position: id, word_count: 1, estimated_minutes: 1, progress: 0, completed,
  });
  expect(continueChapter([ch(1, true), ch(2, false)])?.id).toBe(2);
  expect(continueChapter([ch(1, true), ch(2, true)])?.id).toBe(1);
});

test("bookTitle limpa nomes de arquivo antigos", () => {
  expect(bookTitle("The%20Last%20Wish_%20Andrzej%20Sapkowski")).toBe("The Last Wish Andrzej Sapkowski");
  expect(bookTitle("harry-potter-and-the-philosophers-stone")).toBe("harry potter and the philosophers stone");
  expect(bookTitle("Spider-Man and Me")).toBe("Spider-Man and Me");
  expect(bookTitle("100%")).toBe("100%");
  expect(bookTitle("Dune")).toBe("Dune");
});
