import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db/client.js";
import { passwordResetTokens, users } from "../../db/schema.js";
import { resetDb } from "../../../test/helpers/app.js";
import { purgePasswordResetTokens } from "./token-cleanup.js";

const url = process.env.DATABASE_URL ?? "postgres://cash:cash@localhost:5432/cash_test";
const { db, sql, close } = createDb(url);
const DAY = 86_400_000;
const now = new Date("2026-03-01T00:00:00Z");
let userId: string;

beforeEach(async () => {
  await resetDb(sql);
  const [u] = await db.insert(users).values({ email: "a@b.com", name: "A" }).returning();
  userId = u!.id;
});
afterAll(close);

describe("purgePasswordResetTokens", () => {
  it("apaga usados/expirados há mais de 7 dias e mantém o resto", async () => {
    const row = (h: string, expiresAt: Date, usedAt: Date | null) => ({ userId, tokenHash: h, expiresAt, usedAt });
    await db.insert(passwordResetTokens).values([
      row("a", new Date(now.getTime() - 8 * DAY), null), // expirado há 8d → apaga
      row("b", new Date(now.getTime() + DAY), new Date(now.getTime() - 8 * DAY)), // usado há 8d → apaga
      row("c", new Date(now.getTime() - 2 * DAY), null), // expirado há 2d → mantém
      row("d", new Date(now.getTime() + DAY), null), // válido → mantém
    ]);
    expect(await purgePasswordResetTokens(db, now)).toBe(2);
    expect(await db.select().from(passwordResetTokens)).toHaveLength(2);
  });
});
