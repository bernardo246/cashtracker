import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApps, resetDb, testEnv } from "../helpers/app.js";
import { H, registerUser } from "../helpers/users.js";

afterEach(closeTestApps);

type T = Awaited<ReturnType<typeof buildTestApp>>;
const post = (app: T["app"], url: string, payload: unknown) =>
  app.inject({ method: "POST", url, headers: H, payload: payload as object });
const forgot = async (app: T["app"], email: string, flush: () => Promise<void>) => {
  const res = await post(app, "/auth/forgot-password", { email });
  await flush();
  return res;
};
const tokenFrom = (text: string): string => new URL(/https?:\S+/.exec(text)![0]).searchParams.get("token")!;
const NEW_PASSWORD = "nova-senha-456";

describe("auth: redefinição de senha", () => {
  beforeEach(async () => {
    const { deps } = await buildTestApp();
    await resetDb(deps.sql);
  });

  it("forgot com e-mail inexistente → 202 e nenhum e-mail", async () => {
    const { app, emails, flushBackground } = await buildTestApp();
    const res = await forgot(app, "ninguem@x.com", flushBackground);
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ message: "Se o e-mail existir, enviamos um link" });
    expect(emails).toHaveLength(0);
  });

  it("forgot com e-mail existente → 202 e e-mail com link", async () => {
    const { app, emails, deps, flushBackground } = await buildTestApp();
    const { user } = await registerUser(app, { email: "ana@x.com" });
    const res = await forgot(app, "ana@x.com", flushBackground);
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ message: "Se o e-mail existir, enviamos um link" });
    expect(emails).toHaveLength(1);
    const mail = emails[0]!;
    expect(mail.to).toBe("ana@x.com");
    expect(mail.subject).toBe("Redefinir sua senha — Cash Tracker");
    expect(mail.text).toContain("http://localhost:3000/redefinir-senha?token=");
    expect(mail.text).toContain("O link expira em 30 minutos");
    // só o hash fica no banco
    const [row] = await deps.sql<{ token_hash: string }[]>`SELECT token_hash FROM app.password_reset_tokens WHERE user_id = ${user.id}`;
    expect(row!.token_hash).not.toContain(tokenFrom(mail.text));
  });

  it("falha do provedor de e-mail não afeta a resposta 202", async () => {
    const { app, flushBackground } = await buildTestApp({ emailSender: { send: () => Promise.reject(new Error("brevo fora do ar")) } });
    await registerUser(app, { email: "ana@x.com" });
    expect((await forgot(app, "ana@x.com", flushBackground)).statusCode).toBe(202);
  });

  it("reset válido troca a senha, marca email_verified e revoga sessões", async () => {
    const { app, emails, deps, flushBackground } = await buildTestApp();
    const { cookie, user } = await registerUser(app, { email: "ana@x.com" });
    await forgot(app, "ana@x.com", flushBackground);
    const res = await post(app, "/auth/reset-password", { token: tokenFrom(emails[0]!.text), password: NEW_PASSWORD });
    expect(res.statusCode).toBe(200);

    const refresh = await app.inject({ method: "POST", url: "/auth/refresh", headers: { ...H, cookie } });
    expect(refresh.statusCode).toBe(401);
    expect((await post(app, "/auth/login", { email: "ana@x.com", password: NEW_PASSWORD })).statusCode).toBe(200);
    expect((await post(app, "/auth/login", { email: "ana@x.com", password: "senha-forte-123" })).statusCode).toBe(401);
    const [row] = await deps.sql<{ email_verified: boolean }[]>`SELECT email_verified FROM app.users WHERE id = ${user.id}`;
    expect(row!.email_verified).toBe(true);
  });

  it("token usado de novo → 400 'Link inválido ou expirado'", async () => {
    const { app, emails, flushBackground } = await buildTestApp();
    await registerUser(app, { email: "ana@x.com" });
    await forgot(app, "ana@x.com", flushBackground);
    const token = tokenFrom(emails[0]!.text);
    await post(app, "/auth/reset-password", { token, password: NEW_PASSWORD });
    const res = await post(app, "/auth/reset-password", { token, password: "outra-senha-789" });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string; message: string } }>().error).toMatchObject({
      code: "INVALID_RESET_TOKEN",
      message: "Link inválido ou expirado",
    });
  });

  it("token desconhecido → 400", async () => {
    const { app } = await buildTestApp();
    const res = await post(app, "/auth/reset-password", { token: "x".repeat(43), password: NEW_PASSWORD });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("token após 30 min → 400", async () => {
    let offsetMs = 0;
    const { app, emails, flushBackground } = await buildTestApp({ now: () => new Date(Date.now() + offsetMs) });
    await registerUser(app, { email: "ana@x.com" });
    await forgot(app, "ana@x.com", flushBackground);
    offsetMs = 31 * 60_000;
    const res = await post(app, "/auth/reset-password", { token: tokenFrom(emails[0]!.text), password: NEW_PASSWORD });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { message: string } }>().error.message).toBe("Link inválido ou expirado");
  });

  it("novo forgot invalida o token anterior", async () => {
    const { app, emails, flushBackground } = await buildTestApp();
    await registerUser(app, { email: "ana@x.com" });
    await forgot(app, "ana@x.com", flushBackground);
    await forgot(app, "ana@x.com", flushBackground);
    expect(emails).toHaveLength(2);
    const old = await post(app, "/auth/reset-password", { token: tokenFrom(emails[0]!.text), password: NEW_PASSWORD });
    expect(old.statusCode).toBe(400);
    const fresh = await post(app, "/auth/reset-password", { token: tokenFrom(emails[1]!.text), password: NEW_PASSWORD });
    expect(fresh.statusCode).toBe(200);
  });

  it("conta só-Google consegue definir senha via reset", async () => {
    const { app, emails, deps, flushBackground } = await buildTestApp();
    const { accessToken, user } = await registerUser(app, { email: "g@x.com" });
    await deps.sql`UPDATE app.users SET password_hash = NULL WHERE id = ${user.id}`;
    const before = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${accessToken}` } });
    expect(before.json<{ hasPassword: boolean }>().hasPassword).toBe(false);

    await forgot(app, "g@x.com", flushBackground);
    const res = await post(app, "/auth/reset-password", { token: tokenFrom(emails[0]!.text), password: NEW_PASSWORD });
    expect(res.statusCode).toBe(200);
    const after = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${accessToken}` } });
    expect(after.json<{ hasPassword: boolean }>().hasPassword).toBe(true);
  });

  it("exige Origin válido nas duas rotas", async () => {
    const { app } = await buildTestApp();
    const bad = { origin: "http://evil.example" };
    const a = await app.inject({ method: "POST", url: "/auth/forgot-password", headers: bad, payload: { email: "a@x.com" } });
    const b = await app.inject({ method: "POST", url: "/auth/reset-password", headers: bad, payload: { token: "x".repeat(30), password: NEW_PASSWORD } });
    expect([a.statusCode, b.statusCode]).toEqual([403, 403]);
  });
});

describe("auth: forgot-password em segundo plano", () => {
  it("responde 202 antes do envio terminar; falha é logada sem o token", async () => {
    const { deps } = await buildTestApp();
    await resetDb(deps.sql);
    let release!: () => void;
    let sentText = "";
    const gate = new Promise<void>((r) => (release = r));
    const logs: string[] = [];
    const t = await buildTestApp({
      env: testEnv({ LOG_LEVEL: "error" }),
      logStream: { write: (m) => void logs.push(m) },
      emailSender: {
        send: async (msg) => {
          sentText = msg.text;
          await gate;
          throw new Error("brevo fora do ar");
        },
      },
    });
    await registerUser(t.app, { email: "ana@x.com" });
    const res = await post(t.app, "/auth/forgot-password", { email: "ana@x.com" });
    expect(res.statusCode).toBe(202); // enviou resposta com o envio ainda pendente
    expect(logs).toHaveLength(0);
    // espera o envio ser chamado (a busca/tx rodam em segundo plano), depois libera
    while (sentText === "") await new Promise((r) => setImmediate(r));
    release();
    await t.flushBackground();
    const out = logs.join("");
    expect(out).toContain("brevo fora do ar");
    expect(out).not.toContain(tokenFrom(sentText));
  });
});

describe("auth: rate limit do forgot-password", () => {
  it("4º pedido para o mesmo e-mail na hora → 429 (mesmo trocando de IP)", async () => {
    const { deps } = await buildTestApp();
    await resetDb(deps.sql);
    const { app } = await buildTestApp({ env: testEnv({ RATE_LIMIT_ENABLED: "true", TRUST_PROXY_HOPS: "1" }) });
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/auth/forgot-password",
        headers: { ...H, "x-forwarded-for": `10.0.0.${i + 1}` },
        payload: { email: "ana@x.com" },
      });
      codes.push(res.statusCode);
    }
    expect(codes).toEqual([202, 202, 202, 429]);
  });

  it("falha ao revogar sessões desfaz a troca de senha (mesma transação)", async () => {
    const { app, deps, emails, flushBackground } = await buildTestApp();
    const { user } = await registerUser(app, { email: "atomic@x.com" });
    await forgot(app, "atomic@x.com", flushBackground);
    const token = tokenFrom(emails[0]!.text);
    const [before] = await deps.sql<{ password_hash: string }[]>`SELECT password_hash FROM app.users WHERE id = ${user.id}`;
    const { createPasswordResetService } = await import("../../src/modules/auth/password-reset.service.js");
    const service = createPasswordResetService({
      db: deps.db,
      emailSender: { send: () => Promise.resolve() },
      refreshTokens: {
        revokeAllForUser: (_id: string, tx?: unknown) =>
          Promise.reject(new Error(tx ? "falha ao revogar" : "fora da transação")),
      } as never,
      appUrl: deps.env.APP_URL,
    });
    await expect(service.resetPassword(token, NEW_PASSWORD)).rejects.toThrow("falha ao revogar");
    const [after] = await deps.sql<{ password_hash: string }[]>`SELECT password_hash FROM app.users WHERE id = ${user.id}`;
    expect(after!.password_hash).toBe(before!.password_hash);
  });
});
