import { existsSync } from "node:fs";
import { startServer } from "./bootstrap.js";
import { loadEnv } from "./config/env.js";

if (existsSync(".env")) process.loadEnvFile(".env");

await startServer(loadEnv(process.env));
