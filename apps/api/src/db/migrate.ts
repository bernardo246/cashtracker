import { readdir, readFile } from "node:fs/promises";
import type postgres from "postgres";

const LOCK_ID = 727274;
const DEFAULT_DIR = new URL("./migrations/", import.meta.url);

/** Aplica os arquivos *.sql pendentes em ordem; retorna os nomes aplicados nesta execução. */
export async function runMigrations(sql: postgres.Sql, dir: URL = DEFAULT_DIR): Promise<string[]> {
  // Conexão reservada: o advisory lock é por sessão e precisa do mesmo backend no unlock.
  const conn = await sql.reserve();
  const applied: string[] = [];
  try {
    await conn`SELECT pg_advisory_lock(${LOCK_ID})`;
    try {
      await conn.unsafe("CREATE SCHEMA IF NOT EXISTS app");
      await conn.unsafe(
        `CREATE TABLE IF NOT EXISTS app.schema_migrations (
           name text PRIMARY KEY,
           applied_at timestamptz NOT NULL DEFAULT now())`,
      );
      const done = new Set(
        (await conn<{ name: string }[]>`SELECT name FROM app.schema_migrations`).map((r) => r.name),
      );
      const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
      for (const name of files) {
        if (done.has(name)) continue;
        const content = await readFile(new URL(name, dir), "utf8");
        await conn.unsafe("BEGIN");
        try {
          await conn.unsafe(content);
          await conn`INSERT INTO app.schema_migrations (name) VALUES (${name})`;
          await conn.unsafe("COMMIT");
        } catch (err) {
          await conn.unsafe("ROLLBACK");
          throw err;
        }
        applied.push(name);
      }
    } finally {
      await conn`SELECT pg_advisory_unlock(${LOCK_ID})`;
    }
  } finally {
    conn.release();
  }
  return applied;
}
