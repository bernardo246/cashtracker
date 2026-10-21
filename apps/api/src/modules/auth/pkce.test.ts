import { describe, expect, it } from "vitest";
import { challengeFor, createPkcePair, randomToken } from "./pkce.js";

describe("pkce", () => {
  // verifier do Apêndice B do RFC 7636 (octetos 116, 24, 223, ...); o brief trazia uma versão corrompida
  it("PKCE: vetor do RFC 7636", () =>
    expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"));

  it("createPkcePair gera verifier de 43 chars base64url e o challenge correspondente", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(challengeFor(verifier));
    expect(createPkcePair().verifier).not.toBe(verifier);
  });

  it("randomToken usa base64url com o número de bytes pedido", () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken(16)).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });
});
