import { apiFetch } from "./api";
import { levelsAbove, nearestLevelAbove, pickNextText, type ArticleSummary } from "./articles";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const apiFetchMock = apiFetch as jest.Mock;

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
    book_title: null,
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

test("níveis acima, do mais próximo ao mais distante", () => {
  expect(levelsAbove("A1")).toEqual(["A2", "B1", "B2", "C1"]);
  expect(levelsAbove("C1")).toEqual([]);
});

test("notícias no A1: pula o A2 vazio e usa o B1", async () => {
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation(async (path: string) => (path.includes("level=B1") ? [art(9)] : []));

  const result = await nearestLevelAbove("tok", "A1", "Notícias");

  expect(result).toEqual({ level: "B1", articles: [art(9)] });
  expect(apiFetchMock).toHaveBeenCalledTimes(2);
});

test("nenhum nível acima com textos: null", async () => {
  apiFetchMock.mockReset();
  apiFetchMock.mockResolvedValue([]);
  expect(await nearestLevelAbove("tok", "B2")).toBeNull();
});
