import { ApiError, TIMEOUT_MESSAGE, TIMEOUT_MS, apiFetch } from "./api";

process.env.EXPO_PUBLIC_API_URL = "http://api.test";

const fetchMock = jest.fn();
globalThis.fetch = fetchMock;

function respond(status: number, body: string) {
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));
}

test("sucesso retorna o JSON e envia Authorization quando há token", async () => {
  respond(200, JSON.stringify({ status: "ok" }));

  const data = await apiFetch<{ status: string }>("/health", { token: "abc" });

  expect(data).toEqual({ status: "ok" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("http://api.test/health");
  expect(init.headers.Authorization).toBe("Bearer abc");
});

test("401 com detail lança ApiError com status e detail", async () => {
  respond(401, JSON.stringify({ detail: "Não autenticado" }));

  const error = await apiFetch("/users/me").catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 401, detail: "Não autenticado" });
});

test("erro sem JSON usa detail genérico", async () => {
  respond(500, "Internal Server Error");

  await expect(apiFetch("/health")).rejects.toMatchObject({
    status: 500,
    detail: "Erro inesperado. Tente novamente.",
  });
});

test("204 sem corpo resolve sem tentar ler JSON", async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

  await expect(apiFetch("/vocabulary/1", { method: "DELETE" })).resolves.toBeUndefined();
});

test("FormData vai como está, sem Content-Type JSON (o fetch põe o boundary)", async () => {
  respond(201, JSON.stringify({ id: 1 }));
  const form = new FormData();
  form.append("file", "conteúdo");

  await apiFetch("/books", { method: "POST", token: "abc", body: form });

  const [, init] = fetchMock.mock.calls.at(-1);
  expect(init.body).toBe(form);
  expect(init.headers["Content-Type"]).toBeUndefined();
  expect(init.headers.Authorization).toBe("Bearer abc");
});

test("servidor que não responde: desiste no tempo limite com ApiError status 0", async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const pending = apiFetch("/goals").catch((e: unknown) => e);
    jest.advanceTimersByTime(TIMEOUT_MS);
    const error = await pending;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, detail: TIMEOUT_MESSAGE });
  } finally {
    jest.useRealTimers();
  }
});

test("erro de rede antes do tempo limite continua sendo erro de rede", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
  await expect(apiFetch("/goals")).rejects.toBeInstanceOf(TypeError);
});
