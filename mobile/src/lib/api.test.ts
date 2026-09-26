import { ApiError, apiFetch } from "./api";

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
