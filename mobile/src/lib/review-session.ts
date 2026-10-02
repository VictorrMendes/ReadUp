import type { ReviewCard } from "@/lib/vocabulary";

// Sessão de revisão no app. Cada cartão da fila é respondido uma vez "de verdade" (vai para o
// servidor, que move a caixa). "Ainda aprendendo" põe o cartão de novo no fim, como treino extra:
// essa segunda passada não vai para o servidor (a palavra já voltou para a caixa 0).

export type SessionItem = { card: ReviewCard; practice: boolean };

export type ReviewSession = {
  items: SessionItem[];
  index: number;
  known: number; // acertos na primeira passada
  learning: number; // "ainda aprendendo" na primeira passada
  xp: number;
};

export function startSession(cards: ReviewCard[]): ReviewSession {
  return {
    items: cards.map((card) => ({ card, practice: false })),
    index: 0,
    known: 0,
    learning: 0,
    xp: 0,
  };
}

export function currentItem(session: ReviewSession): SessionItem | null {
  return session.items[session.index] ?? null;
}

/** Avança depois da resposta. `xp`: o que o servidor deu (0 no treino extra). */
export function advance(session: ReviewSession, known: boolean, xp = 0): ReviewSession {
  const item = currentItem(session);
  if (!item) return session;
  const retry = !known && !item.practice;
  const items = retry ? [...session.items, { card: item.card, practice: true }] : session.items;
  return {
    items,
    index: session.index + 1,
    known: session.known + (!item.practice && known ? 1 : 0),
    learning: session.learning + (!item.practice && !known ? 1 : 0),
    xp: session.xp + xp,
  };
}

/** Cartões de primeira passada (o total "de verdade" da sessão). */
export function firstPassTotal(session: ReviewSession): number {
  return session.items.filter((item) => !item.practice).length;
}
