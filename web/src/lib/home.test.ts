import { expect, test } from "vitest";

import { goalActionLabel, heroMessage, minutesLeft, streakLine } from "./home";

test("frase do topo segue a meta", () => {
  const base = { target: 500, words_today: 0, remaining: 500, completed: false };
  expect(heroMessage(undefined)).toBeNull();
  expect(heroMessage(base)).toBe("Que tal um texto curto agora?");
  expect(heroMessage({ ...base, words_today: 320, remaining: 180 })).toBe(
    "Faltam 180 palavras para fechar a meta.",
  );
  expect(heroMessage({ ...base, completed: true })).toBe("Meta de hoje cumprida. Bom trabalho!");
});

test("ação da meta e minutos restantes", () => {
  expect(goalActionLabel(false, true)).toBe("Continuar leitura");
  expect(goalActionLabel(false, false)).toBe("Ler um texto");
  expect(goalActionLabel(true, true)).toBe("Ler mais um");
  expect(minutesLeft(180)).toBe(1);
  expect(minutesLeft(1000)).toBe(5);
});

test("linha da ofensiva", () => {
  expect(streakLine(0, 5, false)).toBe("Recomece hoje · recorde de 5 dias salvo");
  expect(streakLine(3, 5, true)).toBe("de ofensiva · mantida hoje");
  expect(streakLine(3, 5, false)).toBe("de ofensiva · leia hoje para manter");
});
