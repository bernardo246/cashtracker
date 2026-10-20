import { existsSync } from "node:fs";
import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createDb } from "./db/client.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const env = loadEnv(process.env);
const { db, sql } = createDb(env.DATABASE_URL);
// Tarefa 4: await runMigrations(sql) aqui, antes de subir o app.
const app = await buildApp({ env, db, sql });
await app.listen({ port: env.PORT, host: "0.0.0.0" });
