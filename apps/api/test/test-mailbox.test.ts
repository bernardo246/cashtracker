import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApps, resetDb, testEnv } from "./helpers/app.js";
import { H, registerUser } from "./helpers/users.js";

afterEach(closeTestApps);

describe("GET /__test/last-email", () => {
  beforeEach(async () => {
    const { deps } = await buildTestApp();
    await resetDb(deps.sql);
  });

  it("404 com EMAIL_PROVIDER=console", async () => {
    const { app } = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/__test/last-email?to=a@x.com" });
    expect(res.statusCode).toBe(404);
  });

  it("404 com EMAIL_PROVIDER=brevo", async () => {
    const env = testEnv({ EMAIL_PROVIDER: "brevo", BREVO_API_KEY: "k", EMAIL_FROM: "no-reply@x.com" });
    const { app } = await buildTestApp({ env });
    const res = await app.inject({ method: "GET", url: "/__test/last-email?to=a@x.com" });
    expect(res.statusCode).toBe(404);
  });

  it("com memory devolve o último e-mail do destinatário", async () => {
    const env = testEnv({ EMAIL_PROVIDER: "memory" });
    const { app, flushBackground } = await buildTestApp({ env, emailSender: undefined });
    await registerUser(app, { email: "ana@x.com" });
    await app.inject({ method: "POST", url: "/auth/forgot-password", headers: H, payload: { email: "ana@x.com" } });
    await flushBackground();
    const res = await app.inject({ method: "GET", url: "/__test/last-email?to=ANA@x.com" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ to: string; subject: string; text: string }>();
    expect(body.to).toBe("ana@x.com");
    expect(body.subject).toContain("Redefinir");
    expect(body.text).toContain("/redefinir-senha?token=");
  });

  it("com memory: 404 sem e-mail e 404 com query inválida", async () => {
    const env = testEnv({ EMAIL_PROVIDER: "memory" });
    const { app } = await buildTestApp({ env, emailSender: undefined });
    expect((await app.inject({ method: "GET", url: "/__test/last-email?to=n@x.com" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/__test/last-email" })).statusCode).toBe(404);
  });
});
