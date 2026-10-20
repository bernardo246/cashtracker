import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Db = PostgresJsDatabase;

export function createDb(url: string): { db: Db; sql: postgres.Sql; close: () => Promise<void> } {
  // prepare:false é exigido pelo pooler (Supavisor)
  const sql = postgres(url, { max: 5, prepare: false });
  return { db: drizzle(sql), sql, close: () => sql.end() };
}
