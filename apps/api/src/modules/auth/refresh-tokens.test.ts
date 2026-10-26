import { createHash } from "node:crypto";
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

  it("reuso de t1 concorrente com rotação de t2: nenhum token da família sobrevive", async () => {
    for (let i = 0; i < 8; i++) {
      await resetDb(sql);
      clock = new Date("2026-01-01T00:00:00Z");
      const [u] = await db.insert(users).values({ email: `r${i}@b.com`, name: "A" }).returning();
      const t1 = await store.issue(u!.id);
      const r2 = await store.rotate(t1.token);
      if (r2.status !== "rotated") throw new Error("esperava rotated");
      advance(31_000);
      await Promise.all([store.rotate(r2.token), store.rotate(t1.token)]);
      const rows = await db.select().from(refreshTokens);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.every((x) => x.revokedAt !== null)).toBe(true);
    }
  });

  it("logout (revokeFamilyByToken) concorrente com refresh: nenhum token vivo", async () => {
    for (let i = 0; i < 8; i++) {
      await resetDb(sql);
      const [u] = await db.insert(users).values({ email: `l${i}@b.com`, name: "A" }).returning();
      const t1 = await store.issue(u!.id);
      await Promise.all([store.rotate(t1.token), store.revokeFamilyByToken(t1.token)]);
      const rows = await db.select().from(refreshTokens);
      expect(rows.every((x) => x.revokedAt !== null)).toBe(true);
    }
  });

  it("revokeAllForUser concorrente com refresh: nenhum token vivo", async () => {
    for (let i = 0; i < 8; i++) {
      await resetDb(sql);
      const [u] = await db.insert(users).values({ email: `u${i}@b.com`, name: "A" }).returning();
      const t1 = await store.issue(u!.id);
      await Promise.all([store.rotate(t1.token), store.revokeAllForUser(u!.id)]);
      const rows = await db.select().from(refreshTokens);
      expect(rows.every((x) => x.revokedAt !== null)).toBe(true);
    }
  });
});

describe("purgeStale", () => {
  const rowCount = async () => (await db.select().from(refreshTokens)).length;

  it("apaga expirados e revogados há mais de 30 dias; mantém válidos e recentes", async () => {
    await store.issue(userId); // expira em +30d
    const revoked = await store.issue(userId);
    await store.revokeFamilyByToken(revoked.token); // revoked_at = t0
    const recentRevoked = await store.issue(userId);
    advance(31 * DAY); // old expirou há 1 dia; revoked tem 31 dias
    await store.revokeFamilyByToken(recentRevoked.token);
    const valid = await store.issue(userId);
    advance(1 * DAY); // old expirado há 2d: ainda dentro da retenção
    expect(await store.purgeStale(clock)).toBe(1); // só `revoked` (revogado há 32d)
    expect(await rowCount()).toBe(3);
    advance(30 * DAY); // old expirado há 32d; recentRevoked revogado há 31d; valid ainda válido
    expect(await store.purgeStale(clock)).toBe(2);
    const rows = await db.select().from(refreshTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(createHash("sha256").update(valid.token).digest("hex"));
  });

  it("mantém rotacionado ainda válido e o reuso continua detectado após a limpeza", async () => {
    const t1 = await store.issue(userId);
    const r = await store.rotate(t1.token);
    if (r.status !== "rotated") throw new Error("esperava rotated");
    advance(20 * DAY);
    expect(await store.purgeStale(clock)).toBe(0);
    expect(await rowCount()).toBe(2);
    expect(await store.rotate(t1.token)).toEqual({ status: "reuse_detected", userId });
    expect(await store.rotate(r.token)).toEqual({ status: "invalid" });
  });

  it("apaga em lotes e não viola a FK replaced_by em cadeias antigas", async () => {
    let tok = (await store.issue(userId)).token;
    for (let i = 0; i < 3; i++) {
      advance(1000);
      const r = await store.rotate(tok);
      if (r.status !== "rotated") throw new Error("esperava rotated");
      tok = r.token;
    }
    advance(70 * DAY);
    expect(await store.purgeStale(clock)).toBe(4);
    expect(await rowCount()).toBe(0);
  });
});
