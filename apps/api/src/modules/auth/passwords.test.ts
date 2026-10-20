import { describe, expect, it } from "vitest";
import { hashPassword, verifyDummy, verifyPassword } from "./passwords.js";

describe("passwords", () => {
  it("argon2: verifyPassword certo/errado", async () => {
    const hash = await hashPassword("senha-forte-123");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "senha-forte-123")).toBe(true);
    expect(await verifyPassword(hash, "senha-errada")).toBe(false);
  });

  it("verifyPassword devolve false para hash malformado", async () => {
    expect(await verifyPassword("não-é-hash", "x")).toBe(false);
  });

  it("verifyDummy resolve sem lançar", async () => {
    await expect(verifyDummy()).resolves.toBeUndefined();
  });
});
