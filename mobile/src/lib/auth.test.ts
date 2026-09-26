import * as SecureStore from "expo-secure-store";

import { ApiError } from "./api";
import { login, logout } from "./auth";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

process.env.EXPO_PUBLIC_API_URL = "http://api.test";

const fetchMock = jest.fn();
globalThis.fetch = fetchMock;

beforeEach(() => jest.clearAllMocks());

test("login salva o token retornado", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ access_token: "tok", token_type: "bearer" }), { status: 200 }),
  );

  await expect(login("ana@example.com", "senha-forte")).resolves.toBe("tok");

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("http://api.test/auth/login");
  expect(JSON.parse(init.body)).toEqual({ email: "ana@example.com", password: "senha-forte" });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), "tok");
});

test("login com 401 lança ApiError e não salva nada", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ detail: "Email ou senha inválidos" }), { status: 401 }),
  );

  const error = await login("ana@example.com", "errada123").catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 401, detail: "Email ou senha inválidos" });
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});

test("logout apaga o token", async () => {
  await logout();

  expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
});
