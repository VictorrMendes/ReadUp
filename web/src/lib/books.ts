import { apiFetch } from "@/lib/api";

export type Book = {
  id: number;
  title: string;
  page_count: number;
  word_count: number;
  chapter_count: number;
  words_read: number;
  progress: number; // 0–100
  created_at: string;
};

export type Chapter = {
  id: number;
  title: string;
  position: number;
  word_count: number;
  estimated_minutes: number;
  progress: number;
  completed: boolean;
};

export type BookDetail = Book & { chapters: Chapter[] };

/**
 * Título legível para livros importados antes da limpeza no backend (mesma regra de
 * app/books/router.py::_title): decodifica "%20", "_" vira espaço e, num nome sem espaços,
 * hífens viram espaços ("harry-potter-and-the-stone").
 */
export function bookTitle(raw: string): string {
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    // "%" solto: mantém como veio
  }
  name = name.replace(/_/g, " ");
  if (!name.trim().includes(" ") && (name.match(/-/g)?.length ?? 0) >= 2) name = name.replace(/-/g, " ");
  return name.split(/\s+/).filter(Boolean).join(" ") || raw;
}

export const MAX_PDF_BYTES = 20 * 1024 * 1024; // mesmo limite do backend

export const listBooks = () => apiFetch<Book[]>("/books");
export const getBook = (id: number) => apiFetch<BookDetail>(`/books/${id}`);
export const deleteBook = (id: number) => apiFetch<void>(`/books/${id}`, { method: "DELETE" });

/** Envia o PDF (multipart). O nome do arquivo vira o título do livro no backend. */
export function uploadBook(file: File): Promise<BookDetail> {
  const form = new FormData();
  form.append("file", file, file.name);
  return apiFetch<BookDetail>("/books", { method: "POST", body: form });
}

/** Validação antes de enviar (o backend confere de novo). Devolve a mensagem de erro ou null. */
export function checkPdf(file: Pick<File, "name" | "size" | "type">): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Escolha um arquivo PDF.";
  if (file.size > MAX_PDF_BYTES) return "PDF maior que 20 MB";
  return null;
}

/** "Continuar leitura": o primeiro capítulo não concluído; se todos foram, o primeiro. */
export function continueChapter(chapters: Chapter[]): Chapter | undefined {
  return chapters.find((chapter) => !chapter.completed) ?? chapters[0];
}
