import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

function csp(res: Response): string {
  return res.headers.get("content-security-policy") ?? "";
}

describe("proxy", () => {
  it("define CSP com nonce, strict-dynamic e as origens da spec §10", () => {
    const value = csp(proxy(new NextRequest("http://localhost:3000/")));
    expect(value).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(value).toContain("img-src 'self' data: https://lh3.googleusercontent.com");
    expect(value).toContain("connect-src 'self'");
    expect(value).toContain("frame-ancestors 'none'");
    expect(value).not.toContain("unsafe-eval");
  });

  it("style-src permite inline sem nonce; o nonce fica só no script-src", () => {
    const value = csp(proxy(new NextRequest("http://localhost:3000/")));
    const style = /style-src ([^;]+)/.exec(value)?.[1] ?? "";
    expect(style).toBe("'self' 'unsafe-inline'");
    expect(style).not.toContain("nonce-");
  });

  it("matcher ignora /api e /api/x, mas não /api-keys", () => {
    const source = config.matcher[0]?.source ?? "";
    const re = new RegExp(`^${source}$`);
    expect(re.test("/api")).toBe(false);
    expect(re.test("/api/health")).toBe(false);
    expect(re.test("/api-keys")).toBe(true);
    expect(re.test("/")).toBe(true);
  });

  it("gera um nonce novo por requisição", () => {
    const a = csp(proxy(new NextRequest("http://localhost:3000/")));
    const b = csp(proxy(new NextRequest("http://localhost:3000/")));
    expect(a).not.toEqual(b);
  });

  it("repassa o nonce ao Next via x-nonce da requisição", () => {
    const res = proxy(new NextRequest("http://localhost:3000/"));
    const nonce = /'nonce-([^']+)'/.exec(csp(res))?.[1];
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  });
});

describe("proxy: upgrade-insecure-requests", () => {
  it("omite a diretiva em HTTP", () => {
    expect(csp(proxy(new NextRequest("http://127.0.0.1:3100/")))).not.toContain("upgrade-insecure-requests");
  });

  it("inclui a diretiva com x-forwarded-proto=https", () => {
    const req = new NextRequest("http://localhost:3000/", { headers: { "x-forwarded-proto": "https" } });
    expect(csp(proxy(req))).toContain("upgrade-insecure-requests");
  });

  it("inclui a diretiva quando a URL é https", () => {
    expect(csp(proxy(new NextRequest("https://app.example.com/")))).toContain("upgrade-insecure-requests");
  });
});
