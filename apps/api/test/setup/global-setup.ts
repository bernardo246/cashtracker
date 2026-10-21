import postgres from "postgres";
import { runMigrations } from "../../src/db/migrate.js";

const url = process.env.DATABASE_URL ?? "postgres://cash:cash@localhost:5432/cash_test";

export default async function setup(): Promise<void> {
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await runMigrations(sql);
  } finally {
    await sql.end();
  }
}
