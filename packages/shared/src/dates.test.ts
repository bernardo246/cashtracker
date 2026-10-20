import { describe, expect, it } from "vitest";
import { currentMonthSaoPaulo, isMonthKey, monthLabel, shiftMonth, todaySaoPaulo } from "./dates.js";

const lateNightSP = new Date("2026-11-01T01:00:00Z"); // 31/10 22:00 em São Paulo

describe("dates", () => {
  it("todaySaoPaulo", () => expect(todaySaoPaulo(lateNightSP)).toBe("2026-10-31"));
  it("currentMonthSaoPaulo", () => expect(currentMonthSaoPaulo(lateNightSP)).toBe("2026-10"));
  it("shiftMonth", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-10", -23)).toBe("2024-11");
  });
  it("monthLabel", () => expect(monthLabel("2026-10")).toBe("outubro de 2026"));
  it("isMonthKey", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
  });
});
