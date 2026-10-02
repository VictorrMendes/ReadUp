import { ApiError } from "./api";
import { bookTitle, continueChapter, uploadBook, type Chapter } from "./books";

// XMLHttpRequest simulado: guarda o que foi enviado e responde quando o teste manda
class FakeXhr {
  static last: FakeXhr;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown = null;
  timeout = 0;
  status = 0;
  responseText = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  respond(status: number, text: string) {
    this.status = status;
    this.responseText = text;
    this.onload?.();
  }
}

const PICKED = {
  uri: "file:///data/user/0/host.exp.exponent/cache/DocumentPicker/3f2a9c1e.pdf",
  name: "Meu Livro: parte 1/2.pdf",
};

let appended: unknown[][];

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
  appended = [];
  jest.spyOn(FormData.prototype, "append").mockImplementation((...args: unknown[]) => {
    appended.push(args);
  });
});

afterEach(() => jest.restoreAllMocks());

test("uploadBook envia POST com Authorization, sem Content-Type, e a parte { uri, name, type }", async () => {
  const upload = uploadBook("abc", PICKED);
  const xhr = FakeXhr.last;

  expect(xhr.url).toBe("http://api.test/books");
  expect(xhr.method).toBe("POST");
  expect(xhr.headers).toEqual({ Accept: "application/json", Authorization: "Bearer abc" });
  expect(xhr.timeout).toBe(120_000);
  expect(xhr.body).toBeInstanceOf(FormData);
  expect(appended).toEqual([
    [
      "file",
      { uri: PICKED.uri, name: "Meu Livro_ parte 1_2.pdf", type: "application/pdf" },
    ],
  ]);

  xhr.respond(201, JSON.stringify({ id: 9, title: "Meu Livro_ parte 1_2" }));
  await expect(upload).resolves.toEqual({ id: 9, title: "Meu Livro_ parte 1_2" });
});

test("erro do backend com detail vira ApiError com a mensagem dele", async () => {
  const upload = uploadBook("abc", PICKED);
  FakeXhr.last.respond(422, JSON.stringify({ detail: "Arquivo não é um PDF" }));

  const error = await upload.catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 422, detail: "Arquivo não é um PDF" });
});

test("401 e erro sem JSON também viram ApiError", async () => {
  const unauthorized = uploadBook("abc", PICKED);
  FakeXhr.last.respond(401, JSON.stringify({ detail: "Não autenticado" }));
  await expect(unauthorized).rejects.toMatchObject({ status: 401, detail: "Não autenticado" });

  const broken = uploadBook("abc", PICKED);
  FakeXhr.last.respond(502, "<html>Bad Gateway</html>");
  await expect(broken).rejects.toMatchObject({
    status: 502,
    detail: "Erro inesperado. Tente novamente.",
  });
});

test("falha de rede e timeout viram erro comum (não ApiError)", async () => {
  const offline = uploadBook("abc", PICKED);
  FakeXhr.last.onerror?.();
  const networkError = await offline.catch((e: unknown) => e);
  expect(networkError).toBeInstanceOf(Error);
  expect(networkError).not.toBeInstanceOf(ApiError);

  const slow = uploadBook("abc", PICKED);
  FakeXhr.last.ontimeout?.();
  await expect(slow).rejects.toThrow("Tempo esgotado");
});

function chapter(id: number, completed: boolean, progress = 0): Chapter {
  return {
    id,
    title: `Capítulo ${id}`,
    position: id,
    word_count: 100,
    estimated_minutes: 1,
    progress,
    completed,
  };
}

test("continuar leitura abre o primeiro capítulo não concluído", () => {
  const chapters = [chapter(1, true, 100), chapter(2, false, 40), chapter(3, false)];

  expect(continueChapter(chapters)?.id).toBe(2);
});

test("sem progresso começa pelo primeiro", () => {
  expect(continueChapter([chapter(1, false), chapter(2, false)])?.id).toBe(1);
});

test("todos concluídos volta ao primeiro", () => {
  expect(continueChapter([chapter(1, true, 100), chapter(2, true, 100)])?.id).toBe(1);
});

test("sem capítulos não há o que abrir", () => {
  expect(continueChapter([])).toBeUndefined();
});

test("bookTitle limpa nomes de arquivo antigos", () => {
  expect(bookTitle("The%20Last%20Wish_%20Andrzej%20Sapkowski")).toBe("The Last Wish Andrzej Sapkowski");
  expect(bookTitle("harry-potter-and-the-philosophers-stone")).toBe("harry potter and the philosophers stone");
  expect(bookTitle("Spider-Man and Me")).toBe("Spider-Man and Me");
  expect(bookTitle("100%")).toBe("100%");
});
