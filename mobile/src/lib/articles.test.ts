import { pickNextText, type ArticleSummary } from "./articles";

function art(id: number, progress = 0, completed = false): ArticleSummary {
  return {
    id,
    title: `T${id}`,
    category: "Cotidiano",
    difficulty: "A1",
    word_count: 100,
    estimated_minutes: 1,
    source: "ReadUp",
    published_at: null,
    progress,
    completed,
    book_id: null,
  };
}

test("prefere o primeiro não começado, fora o atual e os concluídos", () => {
  const list = [art(1, 100, true), art(2, 40), art(3), art(4)];

  expect(pickNextText(list)?.id).toBe(3);
  expect(pickNextText(list, 3)?.id).toBe(4);
});

test("sem nenhum não começado, pega um em andamento", () => {
  expect(pickNextText([art(1, 100, true), art(2, 40)])?.id).toBe(2);
});

test("tudo concluído: nenhum", () => {
  expect(pickNextText([art(1, 100, true)])).toBeUndefined();
});
