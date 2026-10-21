import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from "../categories.js";
import {
  byCategoryQuery,
  categoryUpdateInput,
  forgotPasswordInput,
  loginInput,
  monthlyQuery,
  registerInput,
  resetPasswordInput,
  transactionCreateInput,
  transactionListQuery,
  transactionUpdateInput,
} from "../index.js";

const base = { type: "expense", categoryId: crypto.randomUUID(), amountCents: 100, occurredOn: "2026-02-28" };

describe("schemas", () => {
  it("normaliza e-mail", () =>
    expect(registerInput.parse({ name: "Ana", email: "  Ana@Gmail.COM ", password: "12345678" }).email).toBe("ana@gmail.com"));
  it("rejeita senha curta", () =>
    expect(registerInput.safeParse({ name: "A", email: "a@b.co", password: "1234567" }).success).toBe(false));
  it("rejeita chaves desconhecidas", () => {
    expect(registerInput.safeParse({ name: "A", email: "a@b.co", password: "12345678", admin: true }).success).toBe(false);
    expect(loginInput.safeParse({ email: "a@b.co", password: "x", extra: 1 }).success).toBe(false);
    expect(forgotPasswordInput.safeParse({ email: "a@b.co", x: 1 }).success).toBe(false);
    expect(resetPasswordInput.safeParse({ token: "t".repeat(20), password: "12345678", x: 1 }).success).toBe(false);
    expect(transactionCreateInput.safeParse({ ...base, userId: "x" }).success).toBe(false);
  });
  it("reset exige token com 20+ caracteres", () =>
    expect(resetPasswordInput.safeParse({ token: "curto", password: "12345678" }).success).toBe(false));

  it("rejeita data inválida", () => {
    expect(transactionCreateInput.safeParse({ ...base, occurredOn: "2026-02-30" }).success).toBe(false);
    expect(transactionCreateInput.safeParse({ ...base, occurredOn: "2026-2-3" }).success).toBe(false);
    expect(transactionCreateInput.safeParse({ ...base, occurredOn: "2025-02-29" }).success).toBe(false);
  });
  it("aceita data válida, inclusive bissexta", () => {
    expect(transactionCreateInput.safeParse(base).success).toBe(true);
    expect(transactionCreateInput.safeParse({ ...base, occurredOn: "2028-02-29" }).success).toBe(true);
  });
  it("valida valor e descrição", () => {
    expect(transactionCreateInput.safeParse({ ...base, amountCents: 0 }).success).toBe(false);
    expect(transactionCreateInput.safeParse({ ...base, amountCents: 1.5 }).success).toBe(false);
    expect(transactionCreateInput.safeParse({ ...base, amountCents: 100_000_000_001 }).success).toBe(false);
    expect(transactionCreateInput.safeParse({ ...base, description: null }).success).toBe(true);
    expect(transactionCreateInput.safeParse({ ...base, description: "x".repeat(141) }).success).toBe(false);
    expect(transactionCreateInput.parse({ ...base, description: "  oi " }).description).toBe("oi");
  });
  it("update exige ao menos um campo", () => {
    expect(transactionUpdateInput.safeParse({}).success).toBe(false);
    expect(transactionUpdateInput.safeParse({ amountCents: 5 }).success).toBe(true);
    expect(categoryUpdateInput.safeParse({}).success).toBe(false);
    expect(categoryUpdateInput.safeParse({ archived: true }).success).toBe(true);
  });

  it("transactionListQuery converte limit e aplica padrão", () => {
    expect(transactionListQuery.parse({}).limit).toBe(50);
    expect(transactionListQuery.parse({ limit: "20" }).limit).toBe(20);
    expect(transactionListQuery.safeParse({ limit: "101" }).success).toBe(false);
    expect(transactionListQuery.safeParse({ month: "2026-13" }).success).toBe(false);
  });
  it("byCategoryQuery exige month xor year", () => {
    expect(byCategoryQuery.safeParse({ type: "expense" }).success).toBe(false);
    expect(byCategoryQuery.safeParse({ type: "expense", month: "2026-10", year: 2026 }).success).toBe(false);
    expect(byCategoryQuery.safeParse({ type: "expense", month: "2026-10" }).success).toBe(true);
    expect(byCategoryQuery.parse({ type: "income", year: "2026" }).year).toBe(2026);
    expect(byCategoryQuery.safeParse({ type: "expense", month: "2026-00" }).success).toBe(false);
  });
  it("monthlyQuery", () => {
    expect(monthlyQuery.parse({}).months).toBe(12);
    expect(monthlyQuery.parse({ months: "24" }).months).toBe(24);
    expect(monthlyQuery.safeParse({ months: "25" }).success).toBe(false);
    expect(monthlyQuery.safeParse({ months: "0" }).success).toBe(false);
  });
});

describe("categories", () => {
  it("DEFAULT_CATEGORIES tem 9 saídas e 5 entradas", () => {
    expect(DEFAULT_CATEGORIES.filter((c) => c.type === "expense")).toHaveLength(9);
    expect(DEFAULT_CATEGORIES.filter((c) => c.type === "income")).toHaveLength(5);
  });
  it("padrões usam ícones e cores permitidos", () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(CATEGORY_ICONS).toContain(c.icon);
      expect(CATEGORY_COLORS).toContain(c.color);
    }
  });
});
