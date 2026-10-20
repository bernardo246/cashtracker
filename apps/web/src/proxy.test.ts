import { NextRequest } from "next/server";
import { proxy } from "./proxy";

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
