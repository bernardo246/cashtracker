// Sobe a API de E2E: recria o banco cash_e2e, gera uma chave JWT efêmera (nunca vai para o repositório)
// e inicia o dist da API. Pré-requisito: `pnpm --filter @cash/api build`.
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

const adminUrl = process.env.E2E_ADMIN_DATABASE_URL ?? "postgres://cash:cash@localhost:5432/cash";
const dbName = "cash_e2e";

const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
try {
  await admin.unsafe(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${dbName}`);
} finally {
  await admin.end();
}

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const dbUrl = new URL(adminUrl);
dbUrl.pathname = `/${dbName}`;

Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "4100",
  APP_URL: "http://127.0.0.1:3100",
  DATABASE_URL: dbUrl.toString(),
  JWT_PRIVATE_KEY: Buffer.from(privateKey).toString("base64"),
  JWT_KEY_ID: "e2e",
  COOKIE_SECRET: randomBytes(32).toString("hex"),
  GOOGLE_CLIENT_ID: "e2e-dummy",
  GOOGLE_CLIENT_SECRET: "e2e-dummy",
  GOOGLE_REDIRECT_URI: "http://127.0.0.1:3100/api/auth/google/callback",
  EMAIL_PROVIDER: "memory",
  LOG_LEVEL: "warn",
  RATE_LIMIT_ENABLED: "false",
  TRUST_PROXY_HOPS: "1",
});

await import(pathToFileURL(new URL("../../../api/dist/start.js", import.meta.url).pathname).href);
