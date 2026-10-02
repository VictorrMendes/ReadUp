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

// Bloco tocável do leitor: uma palavra com a pontuação e o espaço em volta dela. Cada bloco vira um
// elemento próprio na tela (área de toque inteira), e `sentence` diz a qual frase pertence.
// `start`/`end`: posição da palavra dentro de `text` (o destaque marca só ela, sem a pontuação).
export type Chunk = { text: string; word: string | null; sentence: number; start: number; end: number };

// abreviações seguidas de ponto que não terminam frase ("Mr. Dursley", "Dr. Who", "e.g.")
const ABBREVIATIONS = new Set(["mr", "mrs", "ms", "dr", "st", "jr", "sr", "prof", "vs", "etc", "e.g", "i.e", "mt"]);

/** O trecho (espaço/pontuação) depois da palavra `previous` fecha a frase? "3.5" e "Mr." não fecham. */
function endsSentence(between: string, previous: string | null): boolean {
  if (/[!?]/.test(between)) return true;
  // ponto seguido de dígito ("3.5") ou colado em outra letra não termina frase
  const dot = /\.(?!\d)/.exec(between);
  if (!dot) return false;
  // a abreviação só conta se o ponto vem logo depois dela ("Mr. ", não "Mr, ... .")
  if (dot.index === 0 && previous !== null) {
    if (ABBREVIATIONS.has(previous)) return false;
    // iniciais: "J. K. Rowling", "U.S."
    if (previous.length === 1) return false;
  }
  return true;
}

/** Junta os trechos de tokenize() em blocos: o que vem antes da 1ª palavra entra nela e o que vem
 * depois de cada palavra (espaço, vírgula, ponto) fica com ela. Juntar os `text` dá o original. */
export function chunkParagraph(paragraph: string): Chunk[] {
  const chunks: Chunk[] = [];
  let sentence = 0;
  let pending = ""; // pontuação antes da primeira palavra (ex.: aspas de abertura)
  for (const piece of tokenize(paragraph)) {
    if (piece.word !== null) {
      const start = pending.length;
      chunks.push({ text: pending + piece.text, word: piece.word, sentence, start, end: start + piece.text.length });
      pending = "";
      continue;
    }
    const last = chunks[chunks.length - 1];
    if (!last) {
      pending += piece.text;
      continue;
    }
    last.text += piece.text;
    if (endsSentence(piece.text, last.word)) sentence += 1;
  }
  if (pending) chunks.push({ text: pending, word: null, sentence, start: 0, end: 0 });
  return chunks;
}

/** Texto da frase `sentence` do parágrafo (traduzir, ouvir), cortado no limite do backend. */
export function sentenceText(chunks: Chunk[], sentence: number): string {
  return chunks
    .filter((chunk) => chunk.sentence === sentence)
    .map((chunk) => chunk.text)
    .join("")
    .trim()
    .slice(0, MAX_CONTEXT);
}

export type SentenceTranslation = { text: string; translation: string | null };

/** Tradução de uma frase do texto aberto (o backend confere que a frase está nele). */
export function translateSentence(
  token: string,
  articleId: number,
  text: string,
): Promise<SentenceTranslation> {
  return apiFetch<SentenceTranslation>("/vocabulary/translate-sentence", {
    method: "POST",
    token,
    body: { article_id: articleId, text },
  });
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

/** Divide a frase em antes / palavra / depois (1ª ocorrência inteira, sem olhar maiúsculas). */
export function splitAround(
  sentence: string,
  word: string,
): { before: string; match: string; after: string } | null {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // regex simples (sem lookbehind) para qualquer motor JS; o grupo 1 é o caractere antes da palavra
  const found = new RegExp(`(^|[^A-Za-z'])(${escaped})(?![A-Za-z'])`, "i").exec(sentence);
  if (!found) return null;
  const start = found.index + found[1].length;
  return {
    before: sentence.slice(0, start),
    match: found[2],
    after: sentence.slice(start + found[2].length),
  };
}

// --- revisão espaçada (regras no backend: app/vocabulary/review.py) ---

export type ReviewCard = {
  id: number;
  word: string;
  translation: string | null;
  context: string | null;
  box: number;
};

export type ReviewQueue = {
  cards: ReviewCard[]; // para revisar agora (já dentro do limite diário)
  due_total: number;
  reviewed_today: number;
  daily_limit: number;
};

export type ReviewResult = {
  box: number;
  due_on: string | null;
  mastered: boolean;
  xp_gained: number;
  reviewed_today: number;
};

export function getReviewQueue(token: string): Promise<ReviewQueue> {
  return apiFetch<ReviewQueue>("/vocabulary/review", { token });
}

export function answerReview(token: string, id: number, known: boolean): Promise<ReviewResult> {
  return apiFetch<ReviewResult>(`/vocabulary/${id}/review`, {
    method: "POST",
    token,
    body: { known },
  });
}
