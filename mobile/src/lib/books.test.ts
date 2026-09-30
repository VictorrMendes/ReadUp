import { continueChapter, type Chapter } from "./books";

function chapter(id: number, completed: boolean, progress = 0): Chapter {
  return {
    id,
    title: `Capítulo ${id}`,
    position: id,
    word_count: 100,
    estimated_minutes: 1,
    progress,
    completed,
  };
}

test("continuar leitura abre o primeiro capítulo não concluído", () => {
  const chapters = [chapter(1, true, 100), chapter(2, false, 40), chapter(3, false)];

  expect(continueChapter(chapters)?.id).toBe(2);
});

test("sem progresso começa pelo primeiro", () => {
  expect(continueChapter([chapter(1, false), chapter(2, false)])?.id).toBe(1);
});

test("todos concluídos volta ao primeiro", () => {
  expect(continueChapter([chapter(1, true, 100), chapter(2, true, 100)])?.id).toBe(1);
});

test("sem capítulos não há o que abrir", () => {
  expect(continueChapter([])).toBeUndefined();
});
