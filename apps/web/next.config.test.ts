import nextConfig, { buildRewrites } from "./next.config";

describe("buildRewrites", () => {
  it("aponta /api/* para a API_URL", () => {
    expect(buildRewrites("https://x.onrender.com")).toEqual([
      { source: "/api/:path*", destination: "https://x.onrender.com/:path*" },
    ]);
  });

  it("lança erro quando API_URL não está definida", () => {
    expect(() => buildRewrites(undefined)).toThrow(/API_URL/);
    expect(() => buildRewrites("")).toThrow(/API_URL/);
  });
});

describe("nextConfig", () => {
  it("transpila @cash/shared", () => {
    expect(nextConfig.transpilePackages).toEqual(["@cash/shared"]);
  });

  it("define os headers de segurança estáticos", async () => {
    const rules = await nextConfig.headers?.();
    const headers = Object.fromEntries((rules?.[0]?.headers ?? []).map((h) => [h.key, h.value]));
    expect(rules?.[0]?.source).toBe("/:path*");
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=\d+; includeSubDomains/);
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });
});
