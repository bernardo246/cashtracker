import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("mantém text-display (tamanho) junto de uma cor de texto", () => {
    expect(cn("num text-display", "text-danger")).toBe("num text-display text-danger");
    expect(cn("text-display", "text-success")).toBe("text-display text-success");
  });
  it("ainda deduplica tamanhos e cores", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("text-success", "text-danger")).toBe("text-danger");
    expect(cn("text-display", "text-xl")).toBe("text-xl");
  });
});
