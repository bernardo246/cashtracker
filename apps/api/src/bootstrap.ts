import { buildApp } from "./app.js";
import type { Env } from "./config/env.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

// Sobe o servidor: conecta ao banco, aplica migrations pendentes e escuta em 0.0.0.0.
// Encerra com SIGTERM/SIGINT: fecha o Fastify (drena requisições) e depois o pool do banco.
export async function startServer(env: Env): Promise<void> {
  const { db, sql } = createDb(env.DATABASE_URL);
  try {
    await runMigrations(sql);
    const app = await buildApp({ env, db, sql });

    let closing = false;
    const shutdown = async (signal: string): Promise<void> => {
      if (closing) return;
      closing = true;
      app.log.info({ signal }, "encerrando");
      let code = 0;
      try {
        await app.close();
        await sql.end({ timeout: 5 });
      } catch (err) {
        app.log.error({ err }, "falha ao encerrar");
        code = 1;
      }
      process.exit(code);
    };
    process.once("SIGTERM", () => void shutdown("SIGTERM"));
    process.once("SIGINT", () => void shutdown("SIGINT"));

    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    await sql.end({ timeout: 1 }).catch(() => undefined);
    throw err;
  }
}
