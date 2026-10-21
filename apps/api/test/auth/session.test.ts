import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApps, resetDb, testEnv } from "../helpers/app.js";
import { cookiePair, H, registerUser } from "../helpers/users.js";

afterEach(closeTestApps);

type Body = {
  accessToken: string;
  user: { id: string; email: string };
  name: string;
  hasGoogle: boolean;
  error: { code: string; message: string };
};

const post = (app: Awaited<ReturnType<typeof buildTestApp>>["app"], url: string, payload?: unknown, headers: Record<string, string> = H) =>
  app.inject({ method: "POST", url, headers, payload: payload as object });

describe("auth: sessão", () => {
  beforeEach(async () => {
    const { deps } = await buildTestApp();
    await resetDb(deps.sql);
  });

  it("register cria usuário, 14 categorias padrão e cookie rt", async () => {
    const { app, deps } = await buildTestApp();
    const res = await post(app, "/auth/register", { name: "Ana", email: "ana@x.com", password: "senha-forte-123" });
    expect(res.statusCode).toBe(201);
    const body = res.json<Body>();
    expect(body.user).toMatchObject({ name: "Ana", email: "ana@x.com", hasPassword: true, hasGoogle: false, avatarUrl: null });
    expect(typeof body.accessToken).toBe("string");
    const setCookie = String(res.headers["set-cookie"]);
    expect(setCookie).toContain("rt=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/api/auth");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).not.toContain("Secure"); // NODE_ENV=test
    const [row] = await deps.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM app.categories WHERE user_id = ${body.user.id}`;
    expect(row?.n).toBe(14);
  });

  it("register com e-mail existente (case diferente) → 409", async () => {
    const { app } = await buildTestApp();
    await registerUser(app, { email: "ana@x.com" });
    const res = await post(app, "/auth/register", { name: "Outra", email: "ANA@x.com", password: "senha-forte-123" });
    expect(res.statusCode).toBe(409);
    expect(res.json<Body>().error.message).toBe("Este e-mail já tem uma conta. Entre ou use 'Esqueceu a senha'");
  });

  it("register concorrente com o mesmo e-mail → um 201 e um 409", async () => {
    const { app } = await buildTestApp();
    const payload = { name: "Ana", email: "race@x.com", password: "senha-forte-123" };
    const results = await Promise.all([post(app, "/auth/register", payload), post(app, "/auth/register", payload)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
  });

  it("register com dados inválidos → 400 VALIDATION_ERROR", async () => {
    const { app } = await buildTestApp();
    const res = await post(app, "/auth/register", { name: "Ana", email: "x", password: "123" });
    expect(res.statusCode).toBe(400);
    expect(res.json<Body>().error.code).toBe("VALIDATION_ERROR");
  });

  it("login correto → 200 com cookie", async () => {
    const { app } = await buildTestApp();
    await registerUser(app, { email: "ana@x.com", password: "senha-forte-123" });
    const res = await post(app, "/auth/login", { email: " ANA@x.com ", password: "senha-forte-123" });
    expect(res.statusCode).toBe(200);
    expect(res.json<Body>().user.email).toBe("ana@x.com");
    expect(cookiePair(res.headers["set-cookie"])).toBeTruthy();
  });

  it("login errado → 401 'E-mail ou senha incorretos' (e usuário inexistente também)", async () => {
    const { app } = await buildTestApp();
    await registerUser(app, { email: "ana@x.com" });
    for (const email of ["ana@x.com", "ninguem@x.com"]) {
      const res = await post(app, "/auth/login", { email, password: "errada-errada" });
      expect(res.statusCode).toBe(401);
      expect(res.json<Body>().error.message).toBe("E-mail ou senha incorretos");
    }
  });

  it("login de conta só-Google → 401 code USE_GOOGLE", async () => {
    const { app, deps } = await buildTestApp();
    await deps.sql`INSERT INTO app.users (email, name, email_verified) VALUES ('g@x.com', 'Gabi', true)`;
    const res = await post(app, "/auth/login", { email: "g@x.com", password: "qualquer-coisa" });
    expect(res.statusCode).toBe(401);
    expect(res.json<Body>().error.code).toBe("USE_GOOGLE");
    expect(res.json<Body>().error.message).toBe(
      "Esta conta usa o Google. Entre com o Google ou defina uma senha em 'Esqueceu a senha'",
    );
  });

  it("refresh com cookie válido → novo accessToken e novo cookie", async () => {
    const { app } = await buildTestApp();
    const { cookie, user } = await registerUser(app);
    const res = await post(app, "/auth/refresh", undefined, { ...H, cookie });
    expect(res.statusCode).toBe(200);
    expect(res.json<Body>().user.id).toBe(user.id);
    expect(typeof res.json<Body>().accessToken).toBe("string");
    const next = cookiePair(res.headers["set-cookie"]);
    expect(next).toBeTruthy();
    expect(next).not.toBe(cookie);
  });

  it("refresh repetido dentro da tolerância → 200 sem Set-Cookie", async () => {
    const { app } = await buildTestApp();
    const { cookie } = await registerUser(app);
    await post(app, "/auth/refresh", undefined, { ...H, cookie });
    const res = await post(app, "/auth/refresh", undefined, { ...H, cookie });
    expect(res.statusCode).toBe(200);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("reuso após a tolerância → 401 INVALID_REFRESH, limpa cookie e revoga a família", async () => {
    let t = Date.now();
    const { app } = await buildTestApp({ now: () => new Date(t) });
    const { cookie } = await registerUser(app);
    const first = await post(app, "/auth/refresh", undefined, { ...H, cookie });
    const successor = cookiePair(first.headers["set-cookie"])!;
    t += 60_000;
    const reuse = await post(app, "/auth/refresh", undefined, { ...H, cookie });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json<Body>().error.code).toBe("INVALID_REFRESH");
    expect(String(reuse.headers["set-cookie"])).toMatch(/rt=;/);
    const after = await post(app, "/auth/refresh", undefined, { ...H, cookie: successor });
    expect(after.statusCode).toBe(401);
  });

  it("refresh sem cookie → 401 INVALID_REFRESH", async () => {
    const { app } = await buildTestApp();
    const res = await post(app, "/auth/refresh");
    expect(res.statusCode).toBe(401);
    expect(res.json<Body>().error.code).toBe("INVALID_REFRESH");
  });

  it("refresh com cookie desconhecido → 401 e cookie apagado", async () => {
    const { app } = await buildTestApp();
    const res = await post(app, "/auth/refresh", undefined, { ...H, cookie: "rt=naoexiste" });
    expect(res.statusCode).toBe(401);
    expect(String(res.headers["set-cookie"])).toMatch(/rt=;/);
  });

  it.each([
    ["sem Origin", {}],
    ["com Origin diferente", { origin: "http://evil.example" }],
  ])("POST /auth/refresh %s → 403 FORBIDDEN_ORIGIN", async (_n, headers) => {
    const { app } = await buildTestApp();
    const { cookie } = await registerUser(app);
    const res = await post(app, "/auth/refresh", undefined, { ...headers, cookie });
    expect(res.statusCode).toBe(403);
    expect(res.json<Body>().error).toMatchObject({ code: "FORBIDDEN_ORIGIN", message: "Origem não permitida" });
  });

  it("register e login também exigem Origin", async () => {
    const { app } = await buildTestApp();
    const a = await post(app, "/auth/register", { name: "A", email: "a@x.com", password: "senha-forte-123" }, {});
    const b = await post(app, "/auth/login", { email: "a@x.com", password: "x" }, { origin: "http://evil.example" });
    expect([a.statusCode, b.statusCode]).toEqual([403, 403]);
  });

  it("logout revoga: refresh seguinte → 401", async () => {
    const { app } = await buildTestApp();
    const { cookie } = await registerUser(app);
    const out = await post(app, "/auth/logout", undefined, { ...H, cookie });
    expect(out.statusCode).toBe(204);
    expect(String(out.headers["set-cookie"])).toMatch(/rt=;/);
    const res = await post(app, "/auth/refresh", undefined, { ...H, cookie });
    expect(res.statusCode).toBe(401);
  });

  it("logout sem cookie → 204 (idempotente)", async () => {
    const { app } = await buildTestApp();
    const res = await post(app, "/auth/logout");
    expect(res.statusCode).toBe(204);
  });

  it("GET /me sem token → 401; com token → UserDto", async () => {
    const { app } = await buildTestApp();
    const { accessToken, user } = await registerUser(app);
    const none = await app.inject({ method: "GET", url: "/me" });
    expect(none.statusCode).toBe(401);
    expect(none.json<Body>().error.code).toBe("INVALID_TOKEN");
    const bad = await app.inject({ method: "GET", url: "/me", headers: { authorization: "Bearer lixo" } });
    expect(bad.statusCode).toBe(401);
    const ok = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${accessToken}` } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json<Body>()).toEqual(user);
  });

  it("hasGoogle é true quando existe oauth_account", async () => {
    const { app, deps } = await buildTestApp();
    const { accessToken, user } = await registerUser(app);
    await deps.sql`INSERT INTO app.oauth_accounts (user_id, provider, provider_user_id) VALUES (${user.id}, 'google', 'sub-1')`;
    const res = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.json<Body>().hasGoogle).toBe(true);
  });

  it("PATCH /me atualiza o nome; exige auth e valida", async () => {
    const { app } = await buildTestApp();
    const { accessToken } = await registerUser(app);
    const headers = { authorization: `Bearer ${accessToken}` };
    const anon = await app.inject({ method: "PATCH", url: "/me", payload: { name: "Z" } });
    expect(anon.statusCode).toBe(401);
    const bad = await app.inject({ method: "PATCH", url: "/me", headers, payload: { name: "" } });
    expect(bad.statusCode).toBe(400);
    const ok = await app.inject({ method: "PATCH", url: "/me", headers, payload: { name: "  Nova Ana " } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json<Body>().name).toBe("Nova Ana");
  });
});

describe("auth: rate limit", () => {
  it("6º login em 1 min (mesmo IP+e-mail) → 429 com Retry-After; outro e-mail não é afetado", async () => {
    const { app, deps } = await buildTestApp({ env: testEnv({ RATE_LIMIT_ENABLED: "true" }) });
    await resetDb(deps.sql);
    const attempt = (email: string) => post(app, "/auth/login", { email, password: "errada-errada" });
    for (let i = 0; i < 5; i++) expect((await attempt("a@x.com")).statusCode).toBe(401);
    const blocked = await attempt("A@x.com");
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<Body>().error).toMatchObject({
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Tente novamente em instantes.",
    });
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect((await attempt("b@x.com")).statusCode).toBe(401);
  });

  it("20/15min por e-mail vale mesmo trocando o IP (X-Forwarded-For forjado)", async () => {
    const { app, deps } = await buildTestApp({ env: testEnv({ RATE_LIMIT_ENABLED: "true" }) });
    await resetDb(deps.sql);
    const attempt = (n: number) =>
      post(app, "/auth/login", { email: "vitima@x.com", password: "errada-errada" }, { ...H, "x-forwarded-for": `10.0.0.${n}` });
    for (let n = 1; n <= 20; n++) expect((await attempt(n)).statusCode).toBe(401);
    const blocked = await attempt(21);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<Body>().error.code).toBe("RATE_LIMITED");
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
  });
});
