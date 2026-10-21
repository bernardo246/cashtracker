import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env.js";
import { validEnvSource } from "./helpers/app.js";

describe("loadEnv", () => {
  it("rejeita EMAIL_PROVIDER=console em produção", () => {
    expect(() => loadEnv(validEnvSource({ NODE_ENV: "production", EMAIL_PROVIDER: "console" }))).toThrow(/EMAIL_PROVIDER/);
  });

  it("aceita console em desenvolvimento", () => {
    expect(loadEnv(validEnvSource({ NODE_ENV: "development", EMAIL_PROVIDER: "console" })).EMAIL_PROVIDER).toBe("console");
  });
});
