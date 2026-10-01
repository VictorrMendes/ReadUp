import { nextAchievement, remainingLabel, type Achievement } from "./achievements";

function a(id: string, current: number, target: number, unlocked = current >= target): Achievement {
  return { id, title: id, icon: "flag", description: "", current, target, unlocked };
}

test("escolhe a bloqueada de maior fração current/target", () => {
  const list = [
    a("first-text", 1, 1), // desbloqueada: fora
    a("texts-10", 8, 10), // 0,8
    a("words-1k", 900, 1000), // 0,9  ← mais perto
    a("goal-7", 6, 7), // 0,857
  ];

  expect(nextAchievement(list)?.id).toBe("words-1k");
});

test("empate fica com a que vem antes no catálogo", () => {
  expect(nextAchievement([a("texts-10", 5, 10), a("goal-7", 0, 7), a("streak-7", 0, 7), a("words-1k", 500, 1000)])?.id).toBe(
    "texts-10",
  );
});

test("todas desbloqueadas: nenhuma", () => {
  expect(nextAchievement([a("first-text", 1, 1), a("goal-1", 1, 1)])).toBeUndefined();
  expect(nextAchievement([])).toBeUndefined();
});

test.each([
  ["texts-10", 8, 10, "faltam 2 textos"],
  ["texts-10", 9, 10, "falta 1 texto"],
  ["words-10k", 3200, 10000, "faltam 6.800 palavras"],
  ["goal-7", 6, 7, "falta 1 dia com meta"],
  ["streak-7", 4, 7, "faltam 3 dias seguidos"],
])("remainingLabel(%s, %p de %p) = %s", (id, current, target, label) => {
  expect(remainingLabel({ id, current, target })).toBe(label);
});
