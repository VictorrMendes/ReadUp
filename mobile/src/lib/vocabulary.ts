import { apiFetch } from "@/lib/api";

export type Lookup = {
  word: string;
  translation: string | null;
  saved: boolean;
  saved_id: number | null; // id da palavra salva do usuário
};

export type SavedWord = {
  id: number;
  word: string;
  translation: string | null;
  context: string | null;
  article_id: number | null;
  article_title: string | null;
  created_at: string;
};

export function lookupWord(token: string, word: string): Promise<Lookup> {
  return apiFetch<Lookup>(`/vocabulary/lookup?word=${encodeURIComponent(word)}`, { token });
}

// idempotente: salvar de novo devolve a palavra já salva
export function saveWord(
  token: string,
  body: { word: string; article_id?: number; context?: string },
): Promise<SavedWord> {
  return apiFetch<SavedWord>("/vocabulary", { method: "POST", token, body });
}

// ponytail: sem paginação; limit 100 é o teto do backend. Paginar quando alguém passar disso.
export function listWords(token: string): Promise<SavedWord[]> {
  return apiFetch<SavedWord[]>("/vocabulary?limit=100", { token });
}

export function deleteWord(token: string, id: number): Promise<void> {
  return apiFetch<void>(`/vocabulary/${id}`, { method: "DELETE", token });
}

export type Piece = { text: string; word: string | null };

// letras (com acento), com apóstrofo ou hífen só no meio: "don't" e "well-known" são uma palavra
const WORD = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’-][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g;
const MAX_CONTEXT = 300; // limite do backend

/**
 * Divide o parágrafo em trechos preservando todo o texto: juntar os `text` devolve o original.
 * `word` é a palavra tocável (minúscula); espaços, pontuação e números ficam com `word: null`.
 */
export function tokenize(paragraph: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  for (const match of paragraph.matchAll(WORD)) {
    if (match.index > last) pieces.push({ text: paragraph.slice(last, match.index), word: null });
    pieces.push({ text: match[0], word: match[0].toLowerCase().replace("’", "'") });
    last = match.index + match[0].length;
  }
  if (last < paragraph.length) pieces.push({ text: paragraph.slice(last), word: null });
  return pieces;
}

/** A frase (corte em . ! ?) que contém o trecho `pieceIndex` de tokenize(paragraph). */
export function sentenceOf(paragraph: string, pieceIndex: number): string {
  const start = tokenize(paragraph)
    .slice(0, pieceIndex)
    .reduce((length, piece) => length + piece.text.length, 0);
  const before = paragraph.slice(0, start);
  const from =
    Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?")) + 1;
  const end = paragraph.slice(start).search(/[.!?]/);
  const to = end === -1 ? paragraph.length : start + end + 1;
  return paragraph.slice(from, to).trim().slice(0, MAX_CONTEXT);
}
