import { describe, expect, test } from "vitest";

import { safeNext } from "./auth-form";

describe("safeNext", () => {
  test("só aceita caminhos internos", () => {
    expect(safeNext("/ler")).toBe("/ler");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("https://evil.test")).toBe("/");
    expect(safeNext("//evil.test")).toBe("/");
    expect(safeNext("/\\evil.test")).toBe("/");
    expect(safeNext("/\t/evil.test")).toBe("/");
    expect(safeNext("/ /evil.test")).toBe("/");
    expect(safeNext("/livro/3?x=1")).toBe("/livro/3?x=1");
  });
});
