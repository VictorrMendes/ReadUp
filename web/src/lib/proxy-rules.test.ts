import { describe, expect, test } from "vitest";

import { backendPath, sameOriginAllowed } from "./proxy-rules";

describe("backendPath", () => {
  test("repassa só recursos do app", () => {
    expect(backendPath(["articles", "12"])).toBe("/articles/12");
    expect(backendPath(["vocabulary", "review"])).toBe("/vocabulary/review");
  });

  test("bloqueia login direto, raízes desconhecidas e tentativas de sair do caminho", () => {
    expect(backendPath(["auth", "login"])).toBeNull();
    expect(backendPath(["health"])).toBeNull();
    expect(backendPath([])).toBeNull();
    expect(backendPath(["articles", ".."])).toBeNull();
    expect(backendPath(["articles", "a/b"])).toBeNull();
    expect(backendPath(["articles", ""])).toBeNull();
  });
});

describe("sameOriginAllowed", () => {
  test("leitura passa sempre; escrita só da própria origem", () => {
    expect(sameOriginAllowed("GET", null, "app.test")).toBe(true);
    expect(sameOriginAllowed("POST", "https://app.test", "app.test")).toBe(true);
    expect(sameOriginAllowed("POST", "https://evil.test", "app.test")).toBe(false);
    expect(sameOriginAllowed("DELETE", null, "app.test")).toBe(false);
  });
});
