import { ApiError, apiFetch } from "@/lib/api";

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

// nome original sem caracteres de caminho (vira o título do livro no backend)
function safeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim() || "livro.pdf";
}

const UPLOAD_TIMEOUT_MS = 120_000; // PDF de até 20 MB, processado no servidor

/**
 * Envia o PDF escolhido com XMLHttpRequest. O fetch do SDK 57 (expo/fetch) não aceita a parte
 * { uri, name, type } do FormData, e no Expo Go o expo-file-system não pode ler a cópia do
 * DocumentPicker. O XHR continua sendo o do React Native: a rede nativa lê o arquivo pelo uri,
 * com as permissões do app. Erros seguem o apiFetch (ApiError com o detail do backend).
 */
export function uploadBook(
  token: string,
  picked: { uri: string; name: string },
): Promise<BookDetail> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  if (!API_URL) {
    return Promise.reject(
      new Error("EXPO_PUBLIC_API_URL não definida. Copie mobile/.env.example para mobile/.env."),
    );
  }
  const form = new FormData();
  form.append("file", {
    uri: picked.uri,
    name: safeFileName(picked.name), // vira o título do livro no backend
    type: "application/pdf",
  } as unknown as Blob);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/books`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // sem Content-Type: o XHR monta o multipart com o boundary
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // resposta sem JSON: trata abaixo
      }
      if (xhr.status >= 200 && xhr.status < 300 && data !== null) {
        resolve(data as BookDetail);
        return;
      }
      const detail = (data as { detail?: unknown } | null)?.detail;
      reject(
        new ApiError(
          xhr.status,
          typeof detail === "string" ? detail : "Erro inesperado. Tente novamente.",
        ),
      );
    };
    xhr.onerror = () => reject(new Error("Falha de rede ao enviar o PDF"));
    xhr.ontimeout = () => reject(new Error("Tempo esgotado ao enviar o PDF"));
    xhr.send(form);
  });
}

export function deleteBook(token: string, id: number): Promise<void> {
  return apiFetch<void>(`/books/${id}`, { method: "DELETE", token });
}

/** "Continuar leitura": o primeiro capítulo não concluído; se todos foram, o primeiro. */
export function continueChapter(chapters: Chapter[]): Chapter | undefined {
  return chapters.find((chapter) => !chapter.completed) ?? chapters[0];
}
