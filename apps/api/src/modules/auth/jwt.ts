import { createPrivateKey, createPublicKey } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { Env } from "../../config/env.js";
import { unauthorized } from "../../http/errors.js";

export const JWT_AUDIENCE = "cash-tracker-api";
const ACCESS_TTL_SECONDS = 15 * 60;

export function createJwtService(env: Env, now: () => Date = () => new Date()) {
  const privateKey = createPrivateKey(env.JWT_PRIVATE_KEY);
  const publicKey = createPublicKey(privateKey);

  return {
    async sign(userId: string): Promise<string> {
      const iat = Math.floor(now().getTime() / 1000);
      return new SignJWT({})
        .setProtectedHeader({ alg: "RS256", kid: env.JWT_KEY_ID })
        .setSubject(userId)
        .setIssuer(env.APP_URL)
        .setAudience(JWT_AUDIENCE)
        .setIssuedAt(iat)
        .setExpirationTime(iat + ACCESS_TTL_SECONDS)
        .sign(privateKey);
    },

    async verify(token: string): Promise<{ userId: string }> {
      try {
        const { payload } = await jwtVerify(token, publicKey, {
          algorithms: ["RS256"],
          issuer: env.APP_URL,
          audience: JWT_AUDIENCE,
          currentDate: now(),
        });
        if (!payload.sub) throw new Error("sem sub");
        return { userId: payload.sub };
      } catch {
        throw unauthorized("INVALID_TOKEN", "Sessão expirada");
      }
    },
  };
}

export type JwtService = ReturnType<typeof createJwtService>;
