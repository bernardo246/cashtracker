import { afterEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApps, resetDb } from "./helpers/app.js";

afterEach(closeTestApps);

describe("GET /health", () => {
  it("GET /health → 200 {status:'ok'}", async () => {
    const { app } = await buildTestApp();
    const r = await app.inject({ method: "GET", url: "/health" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ status: "ok" });
  });

  it("resetDb tolera schema app inexistente", async () => {
    const { deps } = await buildTestApp();
    await expect(resetDb(deps.sql)).resolves.toBeUndefined();
  });
});
