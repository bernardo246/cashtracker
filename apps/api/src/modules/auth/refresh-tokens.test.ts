import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db/client.js";
import { refreshTokens, users } from "../../db/schema.js";
import { resetDb } from "../../../test/helpers/app.js";
import { createRefreshTokenStore } from "./refresh-tokens.js";

const url = process.env.DATABASE_URL ?? "postgres://cash:cash@localhost:5432/cash_test";
const { db, sql, close } = createDb(url);
const DAY = 86_400_000;

let clock = new Date("2026-01-01T00:00:00Z");
const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};
const store = createRefreshTokenStore(db, () => clock);
let userId: string;

beforeEach(async () => {
  await resetDb(sql);
  clock = new Date("2026-01-01T00:00:00Z");
  const [u] = await db.insert(users).values({ email: "a@b.com", name: "A" }).returning();
  userId = u!.id;
});
afterAll(close);

describe("refresh tokens", () => {
  it("issue guarda só o SHA-256 e expira em 30 dias", async () => {
    const t = await store.issue(userId, "ua");
    expect(t.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(t.expiresAt).toEqual(new Date(clock.getTime() + 30 * DAY));
    const rows = await db.select().from(refreshTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toBe(t.token);
    expect(rows[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0]!.userAgent).toBe("ua");
    expect(rows[0]!.createdAt).toEqual(clock);
  });

  it("rotate devolve token novo e invalida o antigo", async () => {
    const t1 = await store.issue(userId);
    const r = await store.rotate(t1.token, "ua2");
    expect(r.status).toBe("rotated");
    if (r.status !== "rotated") throw new Error("unreachable");
    expect(r.token).not.toBe(t1.token);
    expect(r.userId).toBe(userId);
    expect(r.expiresAt).toEqual(new Date(clock.getTime() + 30 * DAY));
    const rows = await db.select().from(refreshTokens);
    expect(new Set(rows.map((x) => x.familyId)).size).toBe(1);
    const old = rows.find((x) => x.rotatedAt)!;
    expect(old.rotatedAt).toEqual(clock);
    expect(old.replacedBy).toBe(rows.find((x) => !x.rotatedAt)!.id);
  });

  it("reuso dentro de 30 s → grace (abas concorrentes)", async () => {
    const t1 = await store.issue(userId);
    await store.rotate(t1.token);
    advance(10_000);
    expect(await store.rotate(t1.token)).toEqual({ status: "grace", userId });
    expect(await db.select().from(refreshTokens)).toHaveLength(2);
  });

  it("reuso após 30 s → reuse_detected e família revogada", async () => {
    const t1 = await store.issue(userId);
    const r = await store.rotate(t1.token);
    if (r.status !== "rotated") throw new Error("esperava rotated");
    advance(31_000);
    expect(await store.rotate(t1.token)).toEqual({ status: "reuse_detected", userId });
    expect(await store.rotate(r.token)).toEqual({ status: "invalid" });
  });

  it("token expirado → invalid", async () => {
    const t1 = await store.issue(userId);
    advance(30 * DAY + 1000);
    expect(await store.rotate(t1.token)).toEqual({ status: "invalid" });
  });

  it("token desconhecido → invalid", async () => {
    expect(await store.rotate("desconhecido")).toEqual({ status: "invalid" });
  });

  it("duas rotações concorrentes do mesmo token: uma rotated, uma grace", async () => {
    const t1 = await store.issue(userId);
    const results = await Promise.all([store.rotate(t1.token), store.rotate(t1.token)]);
    expect(results.map((r) => r.status).sort()).toEqual(["grace", "rotated"]);
    expect(await db.select().from(refreshTokens)).toHaveLength(2);
  });

  it("issue com familyId mantém a família", async () => {
    const a = await store.issue(userId);
    await store.rotate(a.token);
    const [row] = await db.select().from(refreshTokens).limit(1);
    const b = await store.issue(userId, undefined, row!.familyId);
    const fam = await db.select().from(refreshTokens).where(eq(refreshTokens.familyId, row!.familyId));
    expect(fam).toHaveLength(3);
    expect(b.token).toBeTruthy();
  });

  it("revokeFamilyByToken revoga a família; token desconhecido é no-op", async () => {
    const t1 = await store.issue(userId);
    const r = await store.rotate(t1.token);
    if (r.status !== "rotated") throw new Error("esperava rotated");
    const other = await store.issue(userId);
    await store.revokeFamilyByToken(r.token);
    await expect(store.revokeFamilyByToken("desconhecido")).resolves.toBeUndefined();
    expect(await store.rotate(r.token)).toEqual({ status: "invalid" });
    expect((await store.rotate(other.token)).status).toBe("rotated");
  });

  it("revokeAllForUser revoga todos os tokens do usuário", async () => {
    const a = await store.issue(userId);
    const b = await store.issue(userId);
    await store.revokeAllForUser(userId);
    expect(await store.rotate(a.token)).toEqual({ status: "invalid" });
    expect(await store.rotate(b.token)).toEqual({ status: "invalid" });
  });
});
