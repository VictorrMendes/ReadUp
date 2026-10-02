import { beforeEach, expect, test, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));

const { levelsAbove, nearestLevelAbove } = await import("./articles");

beforeEach(() => {
  apiFetch.mockReset();
});

test("níveis acima, do mais próximo ao mais distante", () => {
  expect(levelsAbove("A1")).toEqual(["A2", "B1", "B2", "C1"]);
  expect(levelsAbove("C1")).toEqual([]);
});

test("notícias no A1: pula o A2 vazio e usa o B1", async () => {
  apiFetch.mockImplementation(async (path: string) => (path.includes("level=B1") ? [{ id: 1 }] : []));

  const result = await nearestLevelAbove("A1", "Notícias");

  expect(result).toEqual({ level: "B1", articles: [{ id: 1 }] });
  expect(apiFetch).toHaveBeenCalledTimes(2); // A2 (vazio) e B1; não buscou B2/C1
  expect(apiFetch.mock.calls[0][0]).toContain("category=Not%C3%ADcias");
});

test("nenhum nível acima com textos: null", async () => {
  apiFetch.mockResolvedValue([]);
  expect(await nearestLevelAbove("B2")).toBeNull();
});
