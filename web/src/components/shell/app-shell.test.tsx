import { expect, test } from "vitest";

import { isActive } from "./app-shell";

test("item do menu ativo", () => {
  expect(isActive("/", "/")).toBe(true);
  expect(isActive("/", "/ler")).toBe(false);
  expect(isActive("/ler", "/ler")).toBe(true);
  expect(isActive("/ler", "/ler/algo")).toBe(true);
  expect(isActive("/ler", "/leraaa")).toBe(false);
  expect(isActive("/ler", "/livro/3", ["/livro"])).toBe(true);
});
