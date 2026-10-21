import type { UserDto } from "@cash/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startFakeGoogle, type IdClaims } from "../fakes/google-server.js";
import { buildTestApp, closeTestApps, resetDb, testEnv } from "../helpers/app.js";
import { cookiePair, H, registerUser } from "../helpers/users.js";

const APP_URL = "http://localhost:3000";
const LOGIN_ERROR = `${APP_URL}/login?erro=google`;
const HOME = `${APP_URL}/visao-geral`;

let google: Awaited<ReturnType<typeof startFakeGoogle>>;
beforeAll(async () => {
  google = await startFakeGoogle();
});
afterAll(() => google.close());
afterEach(closeTestApps);

type Ctx = { app: FastifyInstance; sql: Awaited<ReturnType<typeof buildTestApp>>["deps"]["sql"]; logs: string[] };

async function setup(logLevel = "warn"): Promise<Ctx> {
  const logs: string[] = [];
  const { app, deps } = await buildTestApp({
    google: google.endpoints,
    env: testEnv({ LOG_LEVEL: logLevel }),
    logStream: { write: (m) => void logs.push(m) },
  });
  return { app, sql: deps.sql, logs };
}

async function begin(app: FastifyInstance) {
  const res = await app.inject({ method: "GET", url: "/auth/google" });
  const location = new URL(String(res.headers.location));
  const p = location.searchParams;
  return {
    res,
    location,
    cookie: cookiePair(res.headers["set-cookie"], "g_oauth")!,
    state: p.get("state")!,
    nonce: p.get("nonce")!,
    challenge: p.get("code_challenge")!,
  };
}

const callback = (app: FastifyInstance, query: Record<string, string>, cookie?: string) =>
  app.inject({ method: "GET", url: `/auth/google/callback?${new URLSearchParams(query)}`, headers: cookie ? { cookie } : {} });

async function loginWithGoogle(app: FastifyInstance, claims: Partial<IdClaims> = {}) {
  const flow = await begin(app);
  const code = google.issueCode({ nonce: flow.nonce, ...claims }, { challenge: flow.challenge });
  const res = await callback(app, { code, state: flow.state }, flow.cookie);
  return { res, code, flow };
}

/** Troca o cookie rt por um UserDto (prova que a sessão emitida é válida). */
async function sessionUser(app: FastifyInstance, rt: string | undefined): Promise<{ status: number; user?: UserDto }> {
  const res = await app.inject({ method: "POST", url: "/auth/refresh", headers: { ...H, cookie: rt ?? "" } });
  return { status: res.statusCode, user: res.statusCode === 200 ? res.json<{ user: UserDto }>().user : undefined };
}

const warnReasons = (logs: string[]) =>
  logs
    .map((l) => JSON.parse(l) as { msg: string; reason?: string })
    .filter((l) => l.msg === "google_login_failed")
    .map((l) => l.reason);

const clearsOauthCookie = (setCookie: string | string[] | undefined) =>
  [setCookie ?? []].flat().some((c) => c.startsWith("g_oauth=;") && c.includes("Path=/api/auth/google"));

describe("auth: Google", () => {
  beforeEach(async () => {
    const { sql } = await setup();
    await resetDb(sql);
  });

  it("/auth/google redireciona com S256, state, nonce, scope e prompt", async () => {
    const { app } = await setup();
    const { res, location, state, nonce, challenge } = await begin(app);
    expect(res.statusCode).toBe(302);
    expect(String(res.headers.location).startsWith(`${google.endpoints.authUrl}?`)).toBe(true);
    const p = location.searchParams;
    expect(p.get("client_id")).toBe("test-client-id");
    expect(p.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(p.get("response_type")).toBe("code");
    expect(p.get("scope")).toBe("openid email profile");
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("prompt")).toBe("select_account");
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const setCookie = [res.headers["set-cookie"]].flat().find((c) => c?.startsWith("g_oauth="))!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/api/auth/google");
    expect(setCookie).toContain("Max-Age=300");
    expect(setCookie).not.toContain("Secure"); // NODE_ENV=test
    // assinado e sem segredos legíveis em texto puro? o conteúdo é assinado, não cifrado: só checamos a assinatura
    expect(decodeURIComponent(setCookie.split(";")[0]!)).toMatch(/\.[A-Za-z0-9+/_-]+$/);
  });

  it("callback feliz cria usuário (email_verified, sem senha) + categorias e redireciona para /visao-geral", async () => {
    const { app, sql, logs } = await setup();
    const { res, code } = await loginWithGoogle(app, { sub: "sub-ana", email: "ana@gmail.com", name: "Ana G", picture: "https://lh3.googleusercontent.com/a/x" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(HOME);
    expect(clearsOauthCookie(res.headers["set-cookie"])).toBe(true);
    const rt = cookiePair(res.headers["set-cookie"]);
    const rtLine = [res.headers["set-cookie"]].flat().find((c) => c?.startsWith("rt="))!;
    expect(rtLine).toContain("Path=/api/auth");
    expect(rtLine).toContain("HttpOnly");
    const session = await sessionUser(app, rt);
    expect(session.status).toBe(200);
    expect(session.user).toMatchObject({
      email: "ana@gmail.com",
      name: "Ana G",
      avatarUrl: "https://lh3.googleusercontent.com/a/x",
      hasPassword: false,
      hasGoogle: true,
    });
    const [u] = await sql<{ email_verified: boolean; n: number }[]>`
      SELECT u.email_verified, (SELECT count(*)::int FROM app.categories c WHERE c.user_id = u.id) AS n
      FROM app.users u WHERE u.id = ${session.user!.id}`;
    expect(u).toEqual({ email_verified: true, n: 14 });
    expect(logs.join("")).not.toContain(code);
  });

  it("callback com state diferente → /login?erro=google", async () => {
    const { app, logs } = await setup();
    const flow = await begin(app);
    const code = google.issueCode({ nonce: flow.nonce }, { challenge: flow.challenge });
    const calls = google.tokenCalls();
    const other = `${flow.state.slice(0, -1)}${flow.state.endsWith("A") ? "B" : "A"}`;
    for (const state of [other, "curto"]) {
      const res = await callback(app, { code, state }, flow.cookie);
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(LOGIN_ERROR);
      expect(clearsOauthCookie(res.headers["set-cookie"])).toBe(true);
      expect(cookiePair(res.headers["set-cookie"])).toBeUndefined();
    }
    expect(google.tokenCalls()).toBe(calls); // não chegou a trocar o code
    expect(warnReasons(logs)).toEqual(["state_mismatch", "state_mismatch"]);
  });

  it("callback sem cookie g_oauth → /login?erro=google", async () => {
    const { app, logs } = await setup();
    const flow = await begin(app);
    const code = google.issueCode({ nonce: flow.nonce }, { challenge: flow.challenge });
    const res = await callback(app, { code, state: flow.state });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(LOGIN_ERROR);
    expect(warnReasons(logs)).toEqual(["missing_oauth_cookie"]);
  });

  it("callback com cookie g_oauth adulterado (assinatura inválida) → /login?erro=google", async () => {
    const { app, logs } = await setup();
    const flow = await begin(app);
    const code = google.issueCode({ nonce: flow.nonce }, { challenge: flow.challenge });
    const forged = `g_oauth=${encodeURIComponent(JSON.stringify({ state: flow.state, nonce: flow.nonce, verifier: "x".repeat(43) }))}`;
    const res = await callback(app, { code, state: flow.state }, forged);
    expect(res.headers.location).toBe(LOGIN_ERROR);
    expect(warnReasons(logs)).toEqual(["bad_oauth_cookie"]);
  });

  it("Google devolve ?error=access_denied → /login?erro=google e apaga g_oauth", async () => {
    const { app, logs } = await setup();
    const flow = await begin(app);
    const res = await callback(app, { error: "access_denied", state: flow.state }, flow.cookie);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(LOGIN_ERROR);
    expect(clearsOauthCookie(res.headers["set-cookie"])).toBe(true);
    expect(warnReasons(logs)).toEqual(["provider_error"]);
  });

  it("code inválido / verifier errado na troca → /login?erro=google", async () => {
    const { app, logs } = await setup();
    const flow = await begin(app);
    const code = google.issueCode({ nonce: flow.nonce }, { challenge: "challenge-de-outro-fluxo" });
    const res = await callback(app, { code, state: flow.state }, flow.cookie);
    expect(res.headers.location).toBe(LOGIN_ERROR);
    expect(warnReasons(logs)).toEqual(["token_exchange_failed"]);
  });

  it.each<[string, Partial<IdClaims>]>([
    ["aud errado", { aud: "outro-client" }],
    ["iss errado", { iss: "https://evil.example" }],
    ["expirado", { exp: Math.floor(Date.now() / 1000) - 600, iat: Math.floor(Date.now() / 1000) - 4000 }],
    ["nonce errado", { nonce: "nonce-de-outro-fluxo" }],
    ["email_verified=false", { email_verified: false }],
    ["email_verified='true' (string)", { email_verified: "true" }],
    ["sem e-mail", { email: undefined }],
  ])("id_token com %s → /login?erro=google", async (_name, claims) => {
    const { app, sql, logs } = await setup();
    const { res } = await loginWithGoogle(app, claims);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(LOGIN_ERROR);
    expect(cookiePair(res.headers["set-cookie"])).toBeUndefined();
    expect(warnReasons(logs)).toEqual(["id_token_invalid"]);
    const [row] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM app.users`;
    expect(row?.n).toBe(0);
  });

  it("vincula a usuário existente com e-mail verificado (mesma conta, senha mantida)", async () => {
    const { app, sql } = await setup();
    const existing = await registerUser(app, { email: "ana@gmail.com", password: "senha-forte-123" });
    await sql`UPDATE app.users SET email_verified = true WHERE id = ${existing.user.id}`;
    const { res } = await loginWithGoogle(app, { email: "ana@gmail.com", sub: "sub-ana" });
    expect(res.headers.location).toBe(HOME);
    const session = await sessionUser(app, cookiePair(res.headers["set-cookie"]));
    expect(session.user).toMatchObject({ id: existing.user.id, hasPassword: true, hasGoogle: true });
    // sessão antiga continua válida e a senha ainda funciona
    expect((await sessionUser(app, existing.cookie)).status).toBe(200);
    const login = await app.inject({ method: "POST", url: "/auth/login", headers: H, payload: { email: "ana@gmail.com", password: "senha-forte-123" } });
    expect(login.statusCode).toBe(200);
  });

  it("usuário com senha e e-mail NÃO verificado: vincula, apaga senha e revoga sessões antigas", async () => {
    const { app } = await setup();
    const squatter = await registerUser(app, { email: "ana@gmail.com", password: "senha-do-intruso" }); // email_verified=false
    const { res } = await loginWithGoogle(app, { email: "ana@gmail.com", sub: "sub-ana" });
    expect(res.headers.location).toBe(HOME);
    const fresh = await sessionUser(app, cookiePair(res.headers["set-cookie"]));
    expect(fresh.status).toBe(200);
    expect(fresh.user).toMatchObject({ id: squatter.user.id, hasPassword: false, hasGoogle: true });
    expect((await sessionUser(app, squatter.cookie)).status).toBe(401);
    const login = await app.inject({ method: "POST", url: "/auth/login", headers: H, payload: { email: "ana@gmail.com", password: "senha-do-intruso" } });
    expect(login.statusCode).toBe(401);
    expect(login.json<{ error: { code: string } }>().error.code).toBe("USE_GOOGLE");
  });

  it("e-mail do Google 'Ana@Gmail.com' encontra usuário 'ana@gmail.com'", async () => {
    const { app, sql } = await setup();
    const existing = await registerUser(app, { email: "ana@gmail.com" });
    await sql`UPDATE app.users SET email_verified = true WHERE id = ${existing.user.id}`;
    const { res } = await loginWithGoogle(app, { email: "Ana@Gmail.com" });
    const session = await sessionUser(app, cookiePair(res.headers["set-cookie"]));
    expect(session.user?.id).toBe(existing.user.id);
    const [row] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM app.users`;
    expect(row?.n).toBe(1);
  });

  it("segundo login com o mesmo sub não duplica oauth_accounts", async () => {
    const { app, sql } = await setup();
    const first = await loginWithGoogle(app, { sub: "sub-ana" });
    const second = await loginWithGoogle(app, { sub: "sub-ana", email: "ana.nova@gmail.com" });
    const a = await sessionUser(app, cookiePair(first.res.headers["set-cookie"]));
    const b = await sessionUser(app, cookiePair(second.res.headers["set-cookie"]));
    expect(b.user?.id).toBe(a.user?.id);
    const [row] = await sql<{ accounts: number; users: number }[]>`
      SELECT (SELECT count(*)::int FROM app.oauth_accounts) AS accounts, (SELECT count(*)::int FROM app.users) AS users`;
    expect(row).toEqual({ accounts: 1, users: 1 });
  });

  it("logs de requisição (nível info) não trazem code nem state da query string", async () => {
    const { app, logs } = await setup("info");
    const { res, code, flow } = await loginWithGoogle(app);
    expect(res.headers.location).toBe(HOME);
    const text = logs.join("");
    expect(text).toContain('"url":"/auth/google/callback"'); // o log de requisição aconteceu
    expect(text).not.toContain(code);
    expect(text).not.toContain(flow.state);
  });

  it("o mesmo code/cookie não pode ser reaproveitado", async () => {
    const { app } = await setup();
    const flow = await begin(app);
    const code = google.issueCode({ nonce: flow.nonce }, { challenge: flow.challenge });
    expect((await callback(app, { code, state: flow.state }, flow.cookie)).headers.location).toBe(HOME);
    expect((await callback(app, { code, state: flow.state }, flow.cookie)).headers.location).toBe(LOGIN_ERROR);
  });
});
