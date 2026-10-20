import { generateKeyPairSync } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type postgres from "postgres";
import { buildApp, type AppDeps } from "../../src/app.js";
import { loadEnv, type Env } from "../../src/config/env.js";
import { createDb } from "../../src/db/client.js";
import type { EmailMessage } from "../../src/email/email-sender.js";

const TEST_DATABASE_URL = process.env.DATABASE_URL ?? "postgres://cash:cash@localhost:5432/cash_test";

// gerar RSA é lento; uma chave por módulo basta para os testes
const TEST_PRIVATE_KEY = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

export function validEnvSource(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  const privateKey = TEST_PRIVATE_KEY;
  return {
    NODE_ENV: "test",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: TEST_DATABASE_URL,
    JWT_PRIVATE_KEY: Buffer.from(privateKey).toString("base64"),
    JWT_KEY_ID: "test-key",
    COOKIE_SECRET: "x".repeat(32),
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    EMAIL_PROVIDER: "console",
    LOG_LEVEL: "silent",
    RATE_LIMIT_ENABLED: "false",
    ...overrides,
  };
}

export function testEnv(overrides: Record<string, string | undefined> = {}): Env {
  return loadEnv(validEnvSource(overrides));
}

export async function buildTestApp(overrides: Partial<AppDeps> = {}): Promise<{
  app: FastifyInstance;
  deps: AppDeps;
  emails: EmailMessage[];
}> {
  const env = overrides.env ?? testEnv();
  const { db, sql, close } = createDb(env.DATABASE_URL);
  const emails: EmailMessage[] = [];
  // registra de forma síncrona na chamada de send: testes não precisam de sleeps
  const emailSender = { send: (msg: EmailMessage) => (emails.push(msg), Promise.resolve()) };
  const deps: AppDeps = { env, db, sql, emailSender, ...overrides };
  const app = await buildApp(deps);
  app.addHook("onClose", async () => {
    await close();
  });
  openApps.push(app);
  return { app, deps, emails };
}

const openApps: FastifyInstance[] = [];

export async function closeTestApps(): Promise<void> {
  await Promise.all(openApps.splice(0).map((a) => a.close()));
}

/** TRUNCATE das tabelas de dados do schema app (preserva schema_migrations); tolera o schema não existir. */
export async function resetDb(sql: postgres.Sql): Promise<void> {
  const rows = await sql<{ t: string }[]>`
    SELECT format('%I.%I', schemaname, tablename) AS t
    FROM pg_tables WHERE schemaname = 'app' AND tablename <> 'schema_migrations'`;
  if (rows.length === 0) return;
  await sql.unsafe(`TRUNCATE ${rows.map((r) => r.t).join(", ")} CASCADE`);
}
