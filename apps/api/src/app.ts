import { randomUUID } from "node:crypto";
import helmet from "@fastify/helmet";
import Fastify, { type FastifyInstance } from "fastify";
import type postgres from "postgres";
import type { Env } from "./config/env.js";
import type { Db } from "./db/client.js";
import { registerErrorHandler } from "./http/errors.js";

export type AppDeps = {
  env: Env;
  db: Db;
  sql: postgres.Sql;
  emailSender?: unknown; // EmailSender entra na Tarefa 7
  now?: () => Date;
  google?: unknown; // GoogleEndpoints entra na Tarefa 8
};

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
    trustProxy: true,
    genReqId: () => randomUUID(),
  });

  await app.register(helmet);
  registerErrorHandler(app);

  // Sem prefixo /api: o rewrite da Vercel remove o /api
  app.get("/health", async () => {
    await deps.sql`SELECT 1`;
    return { status: "ok" };
  });

  return app;
}
