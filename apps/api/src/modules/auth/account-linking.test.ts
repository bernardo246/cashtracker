import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db/client.js";
import { categories, oauthAccounts, refreshTokens, users } from "../../db/schema.js";
import { resetDb } from "../../../test/helpers/app.js";
import { linkGoogleAccount } from "./account-linking.js";
import { createRefreshTokenStore } from "./refresh-tokens.js";

const url = process.env.DATABASE_URL ?? "postgres://cash:cash@localhost:5432/cash_test";
const { db, sql, close } = createDb(url);
const store = createRefreshTokenStore(db);

const profile = (over: Partial<Parameters<typeof linkGoogleAccount>[1]> = {}) => ({
  sub: "google-sub-1",
  email: "ana@gmail.com",
  name: "Ana Google",
  picture: "https://lh3.googleusercontent.com/a/ana",
  ...over,
});

beforeEach(() => resetDb(sql));
afterAll(close);

describe("linkGoogleAccount", () => {
  it("sem vínculo nem usuário: cria usuário verificado, sem senha, com categorias e oauth_account", async () => {
    const r = await linkGoogleAccount(db, profile({ email: "  Nova@Gmail.COM " }), store);
    expect(r.created).toBe(true);
    const [u] = await db.select().from(users).where(eq(users.id, r.userId));
    expect(u).toMatchObject({
      email: "nova@gmail.com",
      name: "Ana Google",
      avatarUrl: "https://lh3.googleusercontent.com/a/ana",
      passwordHash: null,
      emailVerified: true,
    });
    expect(await db.select().from(oauthAccounts)).toMatchObject([{ userId: r.userId, provider: "google", providerUserId: "google-sub-1" }]);
    expect(await db.select().from(categories).where(eq(categories.userId, r.userId))).toHaveLength(14);
  });

  it("já vinculado: entra no mesmo usuário e preenche só avatar/nome vazios", async () => {
    const first = await linkGoogleAccount(db, profile({ picture: undefined }), store);
    await db.update(users).set({ name: "" }).where(eq(users.id, first.userId));
    const second = await linkGoogleAccount(db, profile({ name: "Outro Nome", email: "trocou@gmail.com" }), store);
    expect(second).toEqual({ userId: first.userId, created: false });
    const [u] = await db.select().from(users).where(eq(users.id, first.userId));
    expect(u).toMatchObject({ name: "Outro Nome", avatarUrl: "https://lh3.googleusercontent.com/a/ana", email: "ana@gmail.com" });
    await linkGoogleAccount(db, profile({ name: "Terceiro", picture: "https://x/y" }), store);
    const [again] = await db.select().from(users).where(eq(users.id, first.userId));
    expect(again).toMatchObject({ name: "Outro Nome", avatarUrl: "https://lh3.googleusercontent.com/a/ana" });
    expect(await db.select().from(oauthAccounts)).toHaveLength(1);
  });

  it("usuário existente verificado: vincula e mantém a senha e as sessões", async () => {
    const [u] = await db.insert(users).values({ email: "ana@gmail.com", name: "Ana", passwordHash: "hash", emailVerified: true }).returning();
    await store.issue(u!.id);
    const r = await linkGoogleAccount(db, profile({ email: "Ana@Gmail.com" }), store);
    expect(r).toEqual({ userId: u!.id, created: false });
    const [after] = await db.select().from(users).where(eq(users.id, u!.id));
    expect(after!.passwordHash).toBe("hash");
    const tokens = await db.select().from(refreshTokens);
    expect(tokens.every((t) => t.revokedAt === null)).toBe(true);
  });

  it("usuário existente NÃO verificado: vincula, apaga a senha, verifica o e-mail e revoga as sessões", async () => {
    const [u] = await db.insert(users).values({ email: "ana@gmail.com", name: "Ana", passwordHash: "hash", emailVerified: false }).returning();
    await store.issue(u!.id);
    const r = await linkGoogleAccount(db, profile(), store);
    expect(r).toEqual({ userId: u!.id, created: false });
    const [after] = await db.select().from(users).where(eq(users.id, u!.id));
    expect(after).toMatchObject({ passwordHash: null, emailVerified: true });
    const tokens = await db.select().from(refreshTokens);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.revokedAt).not.toBeNull();
  });

  it("dois logins concorrentes do mesmo novo sub resultam em um só usuário e um só vínculo", async () => {
    const results = await Promise.all([linkGoogleAccount(db, profile(), store), linkGoogleAccount(db, profile(), store)]);
    expect(new Set(results.map((r) => r.userId)).size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(await db.select().from(users)).toHaveLength(1);
    expect(await db.select().from(oauthAccounts)).toHaveLength(1);
  });
});
