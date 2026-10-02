import { describe, expect, it } from "vitest";

import { formatDays, formatNumber, initials } from "@/lib/format";

describe("format", () => {
  it("formata números no padrão pt-BR", () => {
    expect(formatNumber(3450)).toBe("3.450");
    expect(formatNumber(1234567)).toBe("1.234.567");
    expect(formatNumber(12)).toBe("12");
  });

  it("singular e plural de dias", () => {
    expect(formatDays(1)).toBe("1 dia");
    expect(formatDays(3)).toBe("3 dias");
  });

  it("iniciais: primeira e última palavra", () => {
    expect(initials("Ana Maria Souza")).toBe("AS");
    expect(initials("  ana ")).toBe("A");
    expect(initials("")).toBe("");
  });
});
