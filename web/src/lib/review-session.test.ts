import { expect, test } from "vitest";

import { advance, currentItem, firstPassTotal, startSession } from "./review-session";

const card = (id: number) => ({ id, word: `w${id}`, translation: null, context: null, box: 0 });

test("acerto avança e soma XP; 'ainda aprendendo' volta uma vez no fim como treino", () => {
  let session = startSession([card(1), card(2)]);

  session = advance(session, true, 2);
  session = advance(session, false, 0);

  expect(currentItem(session)).toEqual({ card: card(2), practice: true });
  expect(firstPassTotal(session)).toBe(2);
  expect([session.known, session.learning, session.xp]).toEqual([1, 1, 2]);

  // errar de novo no treino não repete outra vez nem muda o placar
  session = advance(session, false);
  expect(currentItem(session)).toBeNull();
  expect([session.known, session.learning]).toEqual([1, 1]);
});

test("sessão vazia já termina", () => {
  expect(currentItem(startSession([]))).toBeNull();
});
