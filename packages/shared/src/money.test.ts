import { describe, expect, it } from "vitest";
import { formatBrl, parseBrlToCents } from "./money.js";

describe("money", () => {
  it.each([
    ["1.234,56", 123456],
    ["10,5", 1050],
    ["R$ 7", 700],
    ["  0,99 ", 99],
    ["1234", 123400],
  ])("parseBrlToCents(%s) = %i", (i, o) => expect(parseBrlToCents(i)).toBe(o));

  it.each(["", "abc", "0,00", "0", "-5", "1,234", "12,3,4", "1000000000,01"])(
    "parseBrlToCents(%s) = null",
    (i) => expect(parseBrlToCents(i)).toBeNull(),
  );

  it("aceita exatamente o teto", () => expect(parseBrlToCents("1.000.000.000,00")).toBe(100_000_000_000));

  it("formatBrl", () => {
    // Intl usa espaço não separável entre o símbolo e o valor
    expect(formatBrl(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });
});
