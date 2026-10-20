import { existsSync } from "node:fs";
import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const env = loadEnv(process.env);
const { db, sql } = createDb(env.DATABASE_URL);
await runMigrations(sql);
const app = await buildApp({ env, db, sql });
await app.listen({ port: env.PORT, host: "0.0.0.0" });
