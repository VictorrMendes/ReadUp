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

export function listBooks(token: string): Promise<Book[]> {
  return apiFetch<Book[]>("/books", { token });
}

export function getBook(token: string, id: number): Promise<BookDetail> {
  return apiFetch<BookDetail>(`/books/${id}`, { token });
}

export function uploadBook(
  token: string,
  file: { uri: string; name: string },
): Promise<BookDetail> {
  const form = new FormData();
  // no React Native, arquivo local vai no multipart como { uri, name, type }
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: "application/pdf",
  } as unknown as Blob);
  return apiFetch<BookDetail>("/books", { method: "POST", token, body: form });
}

export function deleteBook(token: string, id: number): Promise<void> {
  return apiFetch<void>(`/books/${id}`, { method: "DELETE", token });
}

/** "Continuar leitura": o primeiro capítulo não concluído; se todos foram, o primeiro. */
export function continueChapter(chapters: Chapter[]): Chapter | undefined {
  return chapters.find((chapter) => !chapter.completed) ?? chapters[0];
}
