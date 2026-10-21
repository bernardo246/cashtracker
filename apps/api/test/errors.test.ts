import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { badRequest, conflict, notFound, unauthorized } from "../src/http/errors.js";
import { buildTestApp, closeTestApps, testEnv } from "./helpers/app.js";

afterEach(closeTestApps);

type ErrBody = { code: string; message: string; fields?: Record<string, string>; requestId?: string };
const err = (r: { json: () => unknown }) => (r.json() as { error: ErrBody }).error;

describe("error handler", () => {
  it("erro inesperado → 500 com requestId e mensagem genérica", async () => {
    const { app } = await buildTestApp();
    app.get("/boom", () => {
      throw new Error("segredo interno");
    });
    const r = await app.inject({ method: "GET", url: "/boom" });
    expect(r.statusCode).toBe(500);
    expect(err(r)).toMatchObject({ code: "INTERNAL_ERROR", message: "Algo deu errado. Tente novamente." });
    expect(err(r).requestId).toBeTypeOf("string");
    expect(r.body).not.toContain("segredo interno");
  });

  it("ZodError → 400 VALIDATION_ERROR com fields por caminho", async () => {
    const { app } = await buildTestApp();
    app.post("/v", (req) => z.strictObject({ a: z.string(), b: z.object({ c: z.number() }) }).parse(req.body));
    const r = await app.inject({ method: "POST", url: "/v", payload: { a: 1, b: { c: "x" } } });
    expect(r.statusCode).toBe(400);
    const error = err(r);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(error.fields ?? {}).sort()).toEqual(["a", "b.c"]);
    expect(error.requestId).toBeTypeOf("string");
  });

  it.each([
    [notFound(), 404, "NOT_FOUND"],
    [conflict("EMAIL_TAKEN", "x"), 409, "EMAIL_TAKEN"],
    [badRequest("BAD", "x", { f: "m" }), 400, "BAD"],
    [unauthorized("NO_AUTH", "x"), 401, "NO_AUTH"],
  ])("AppError → status e código próprios", async (e, status, code) => {
    const { app } = await buildTestApp();
    app.get("/e", () => {
      throw e;
    });
    const r = await app.inject({ method: "GET", url: "/e" });
    expect(r.statusCode).toBe(status);
    expect(err(r).code).toBe(code);
  });

  it("AppError inclui fields quando presentes", async () => {
    const { app } = await buildTestApp();
    app.get("/e", () => {
      throw badRequest("BAD", "x", { f: "m" });
    });
    const r = await app.inject({ method: "GET", url: "/e" });
    expect(err(r).fields).toEqual({ f: "m" });
  });

  it("erro com statusCode 429 → RATE_LIMITED", async () => {
    const { app } = await buildTestApp();
    app.get("/rl", () => {
      throw Object.assign(new Error("Rate limit exceeded"), { statusCode: 429 });
    });
    const r = await app.inject({ method: "GET", url: "/rl" });
    expect(r.statusCode).toBe(429);
    expect(err(r).code).toBe("RATE_LIMITED");
  });

  it("rota inexistente → 404 no formato padrão", async () => {
    const { app } = await buildTestApp();
    const r = await app.inject({ method: "GET", url: "/nada" });
    expect(r.statusCode).toBe(404);
    expect(err(r)).toMatchObject({ code: "NOT_FOUND" });
  });

  it("JSON malformado → 400", async () => {
    const { app } = await buildTestApp();
    app.post("/j", () => ({}));
    const r = await app.inject({
      method: "POST",
      url: "/j",
      payload: "{oops",
      headers: { "content-type": "application/json" },
    });
    expect(r.statusCode).toBe(400);
    expect(err(r).code).toBe("BAD_REQUEST");
  });

  it("corpo grande demais (413) → 413 BAD_REQUEST, logado em info", async () => {
    const lines: string[] = [];
    const { app } = await buildTestApp({ env: testEnv({ LOG_LEVEL: "info" }), logStream: { write: (m) => void lines.push(m) } });
    app.post("/j", () => ({}));
    const r = await app.inject({
      method: "POST",
      url: "/j",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ x: "a".repeat(1_100_000) }),
    });
    expect(r.statusCode).toBe(413);
    expect(err(r).code).toBe("BAD_REQUEST");
    expect(lines.some((l) => l.includes('"level":50'))).toBe(false);
  });

  it("content-type não suportado (415) → 415 BAD_REQUEST", async () => {
    const { app } = await buildTestApp();
    app.post("/j", () => ({}));
    const r = await app.inject({ method: "POST", url: "/j", headers: { "content-type": "application/xml" }, payload: "<a/>" });
    expect(r.statusCode).toBe(415);
    expect(err(r).code).toBe("BAD_REQUEST");
  });

  it("erro de banco não vaza query nem parâmetros no log", async () => {
    const lines: string[] = [];
    const { app } = await buildTestApp({ env: testEnv({ LOG_LEVEL: "info" }), logStream: { write: (m) => void lines.push(m) } });
    app.get("/db", () => {
      const cause = Object.assign(new Error("duplicate key"), { code: "23505" });
      throw new DrizzleQueryError("select * from users where hash = $1", ["$argon2id$FAKEHASH", "ana@segredo.com"], cause);
    });
    const r = await app.inject({ method: "GET", url: "/db" });
    expect(r.statusCode).toBe(500);
    const log = lines.join("\n");
    expect(log).toContain("23505");
    expect(log).not.toContain("FAKEHASH");
    expect(log).not.toContain("ana@segredo.com");
    expect(log).not.toContain("params:");
    expect(log).not.toContain("select * from users");
  });
});
