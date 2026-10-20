import { createHash, randomBytes } from "node:crypto";

/** Bytes aleatórios em base64url (32 bytes → 43 caracteres). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** RFC 7636 S256: BASE64URL(SHA256(verifier)). */
export function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** verifier de 43 caracteres (limite mínimo do RFC 7636, 256 bits de entropia). */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken(32);
  return { verifier, challenge: challengeFor(verifier) };
}
