import { describe, expect, it } from "vitest";
import { validEnvSource } from "../../test/helpers/app.js";
import { loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("lista as chaves ausentes", () => {
    expect(() => loadEnv({})).toThrow(/APP_URL/);
  });

  it("aplica defaults e decodifica a chave JWT de base64", () => {
    const src = validEnvSource();
    const env = loadEnv(src);
    expect(env.PORT).toBe(4000);
    expect(env.EMAIL_FROM_NAME).toBe("Cash Tracker");
    expect(env.JWT_PRIVATE_KEY).toContain("BEGIN PRIVATE KEY");
    expect(env.RATE_LIMIT_ENABLED).toBe(false);
    expect(loadEnv({ ...src, RATE_LIMIT_ENABLED: undefined, LOG_LEVEL: undefined }).RATE_LIMIT_ENABLED).toBe(true);
  });

  it("TRUST_PROXY_HOPS: default 1, aceita inteiros >= 0, rejeita negativos e não inteiros", () => {
    expect(loadEnv(validEnvSource()).TRUST_PROXY_HOPS).toBe(1);
    expect(loadEnv(validEnvSource({ TRUST_PROXY_HOPS: "2" })).TRUST_PROXY_HOPS).toBe(2);
    expect(loadEnv(validEnvSource({ TRUST_PROXY_HOPS: "0" })).TRUST_PROXY_HOPS).toBe(0);
    expect(() => loadEnv(validEnvSource({ TRUST_PROXY_HOPS: "-1" }))).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadEnv(validEnvSource({ TRUST_PROXY_HOPS: "1.5" }))).toThrow(/TRUST_PROXY_HOPS/);
  });

  it("COOKIE_SECRET exige 32+ caracteres", () => {
    expect(() => loadEnv(validEnvSource({ COOKIE_SECRET: "curto" }))).toThrow(/COOKIE_SECRET/);
  });

  it("brevo exige BREVO_API_KEY e EMAIL_FROM", () => {
    expect(() => loadEnv(validEnvSource({ EMAIL_PROVIDER: "brevo" }))).toThrow(/BREVO_API_KEY, EMAIL_FROM/);
    expect(
      loadEnv(validEnvSource({ EMAIL_PROVIDER: "brevo", BREVO_API_KEY: "k", EMAIL_FROM: "a@b.com" })).EMAIL_PROVIDER,
    ).toBe("brevo");
  });

  it("não vaza valores na mensagem de erro", () => {
    let message = "";
    try {
      loadEnv(validEnvSource({ COOKIE_SECRET: "segredo-curto" }));
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("COOKIE_SECRET");
    expect(message).not.toContain("segredo-curto");
  });
});
