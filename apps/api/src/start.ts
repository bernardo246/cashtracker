import { startServer } from "./bootstrap.js";
import { loadEnv } from "./config/env.js";

await startServer(loadEnv(process.env));
