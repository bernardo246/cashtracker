import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import type postgres from "postgres";
import type { Env } from "./config/env.js";
import type { Db } from "./db/client.js";
import { createBrevoSender } from "./email/brevo.js";
import { createConsoleSender } from "./email/console.js";
import type { EmailSender } from "./email/email-sender.js";
import { createMemorySender } from "./email/memory.js";
import { testMailboxRoutes } from "./modules/dev/test-mailbox.routes.js";
import { registerAuthGuard } from "./http/auth-guard.js";
import { registerErrorHandler } from "./http/errors.js";
import { categoryRoutes } from "./modules/categories/categories.routes.js";
import { createCategoryService } from "./modules/categories/categories.service.js";
import { reportRoutes } from "./modules/reports/reports.routes.js";
import { createReportService } from "./modules/reports/reports.service.js";
import { transactionRoutes } from "./modules/transactions/transactions.routes.js";
import { createTransactionService } from "./modules/transactions/transactions.service.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createGoogleClient, DEFAULT_GOOGLE_ENDPOINTS, type GoogleEndpoints } from "./modules/auth/google-client.js";
import { googleRoutes } from "./modules/auth/google.routes.js";
import { createPasswordResetService } from "./modules/auth/password-reset.service.js";
import { createJwtService } from "./modules/auth/jwt.js";
import { createRefreshTokenStore } from "./modules/auth/refresh-tokens.js";

export type AppDeps = {
  env: Env;
  db: Db;
  sql: postgres.Sql;
  emailSender?: EmailSender;
  now?: () => Date;
  onBackgroundTask?: (task: Promise<unknown>) => void; // testes aguardam trabalho em segundo plano
  logStream?: { write(msg: string): void }; // testes capturam logs
  google?: GoogleEndpoints; // padrão: endpoints reais do Google (spec §6.4); testes usam o servidor falso
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
      // igual ao serializer padrão do Fastify, mas sem a query string: ela pode carregar segredos
      // (ex.: code/state do callback do Google)
      serializers: {
        req: (req: FastifyRequest) => ({
          method: req.method,
          url: req.url.split("?", 1)[0],
          version: [req.headers["accept-version"]].flat()[0],
          host: req.host,
          remoteAddress: req.ip,
          remotePort: req.socket?.remotePort,
        }),
      },
      ...(deps.logStream && { stream: deps.logStream }),
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

  const refreshTokens = createRefreshTokenStore(deps.db, deps.now);
  const memoryMailbox = deps.env.EMAIL_PROVIDER === "memory" ? createMemorySender() : undefined;
  const emailSender =
    deps.emailSender ??
    memoryMailbox ??
    (deps.env.EMAIL_PROVIDER === "brevo" ? createBrevoSender(deps.env) : createConsoleSender(app.log));
  if (memoryMailbox) await app.register(testMailboxRoutes, { mailbox: memoryMailbox });

  await app.register(authRoutes, {
    env: deps.env,
    auth: createAuthService(deps.db, deps.now),
    jwt,
    refreshTokens,
    onBackgroundTask: deps.onBackgroundTask,
    passwordReset: createPasswordResetService({
      db: deps.db,
      emailSender,
      refreshTokens,
      appUrl: deps.env.APP_URL,
      now: deps.now,
    }),
  });

  await app.register(googleRoutes, {
    env: deps.env,
    db: deps.db,
    google: createGoogleClient(deps.env, deps.google ?? DEFAULT_GOOGLE_ENDPOINTS, fetch, deps.now),
    refreshTokens,
  });

  await app.register(categoryRoutes, { env: deps.env, categories: createCategoryService(deps.db, deps.now) });
  await app.register(transactionRoutes, { env: deps.env, transactions: createTransactionService(deps.db, deps.now) });

  await app.register(reportRoutes, { env: deps.env, reports: createReportService(deps.db, deps.sql, deps.now) });

  return app;
}
