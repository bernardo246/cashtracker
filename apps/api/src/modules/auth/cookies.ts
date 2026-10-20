import type { FastifyReply } from "fastify";
import type { Env } from "../../config/env.js";

export const REFRESH_COOKIE = "rt";

// O path inclui /api porque é o que o navegador vê (rewrite da Vercel remove o prefixo no backend)
const options = (env: Env) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/api/auth",
  secure: env.NODE_ENV === "production",
});

export function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date, env: Env): void {
  reply.setCookie(REFRESH_COOKIE, token, { ...options(env), expires: expiresAt });
}

export function clearRefreshCookie(reply: FastifyReply, env: Env): void {
  reply.clearCookie(REFRESH_COOKIE, options(env));
}
