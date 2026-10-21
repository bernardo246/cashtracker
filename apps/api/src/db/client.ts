import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Db = PostgresJsDatabase<typeof schema>;

export function createDb(url: string): { db: Db; sql: postgres.Sql; close: () => Promise<void> } {
  // prepare:false é exigido pelo pooler (Supavisor)
  const sql = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  return { db: drizzle(sql, { schema }), sql, close: () => sql.end() };
}
