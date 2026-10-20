import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import type postgres from "postgres";
import type { Env } from "./config/env.js";
import type { Db } from "./db/client.js";
import { registerAuthGuard } from "./http/auth-guard.js";
import { registerErrorHandler } from "./http/errors.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createJwtService } from "./modules/auth/jwt.js";
import { createRefreshTokenStore } from "./modules/auth/refresh-tokens.js";

export type AppDeps = {
  env: Env;
  db: Db;
  sql: postgres.Sql;
  emailSender?: unknown; // EmailSender entra na Tarefa 7
  now?: () => Date;
  google?: unknown; // GoogleEndpoints entra na Tarefa 8
};

// Fastify 5.12 trata `trustProxy: <número>` como "não confiar em ninguém" (fail closed), então
// usamos a função equivalente: confia nos N primeiros saltos a partir do socket.
function trustProxyFor(hops: number): boolean | ((addr: string, i: number) => boolean) {
  return hops > 0 ? (_addr, i) => i < hops : false;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: deps.env.LOG_LEVEL,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        'res.headers["set-cookie"]',
        "*.password",
        "*.token",
      ],
    },
    // número de saltos (não `true`): evita que o cliente forje X-Forwarded-For para trocar de bucket de rate limit
    trustProxy: trustProxyFor(deps.env.TRUST_PROXY_HOPS),
    genReqId: () => randomUUID(),
  });

  await app.register(helmet);
  await app.register(cookie, { secret: deps.env.COOKIE_SECRET });
  if (deps.env.RATE_LIMIT_ENABLED) {
    // global:false — limites declarados por rota (spec §6.8); memória, instância única
    await app.register(rateLimit, { global: false });
  }
  registerErrorHandler(app);

  const jwt = createJwtService(deps.env, deps.now);
  registerAuthGuard(app, jwt);

  // Sem prefixo /api: o rewrite da Vercel remove o /api
  app.get("/health", async () => {
    await deps.sql`SELECT 1`;
    return { status: "ok" };
  });

  await app.register(authRoutes, {
    env: deps.env,
    auth: createAuthService(deps.db, deps.now),
    jwt,
    refreshTokens: createRefreshTokenStore(deps.db, deps.now),
  });

  return app;
}
