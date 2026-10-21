import type { FastifyRequest } from "fastify";
import type { Env } from "../config/env.js";

export const AUTHED_MAX_PER_MINUTE = 300;

// Chave por usuário autenticado. O hook roda em preHandler, depois de `app.authenticate`
// (que deve vir antes na lista de preHandlers da rota); sem userId cai para o IP.
const authedKey = (req: FastifyRequest): string => (req.userId ? `u:${req.userId}` : `ip:${req.ip}`);

/** `config` de rota para as rotas autenticadas (300/min por usuário, spec §6.8). Vazio se o rate limit está desligado. */
export function authedRateLimit(env: Env) {
  return env.RATE_LIMIT_ENABLED
    ? { rateLimit: { max: AUTHED_MAX_PER_MINUTE, timeWindow: 60_000, hook: "preHandler" as const, keyGenerator: authedKey } }
    : {};
}
