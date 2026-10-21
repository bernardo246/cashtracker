import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { resetDb } from "../../test/helpers/app.js";

const url = process.env.DATABASE_URL ?? "postgres://cash:cash@localhost:5432/cash_test";
const { sql, close } = createDb(url);

// Recria o schema do zero; ao final deixa o banco migrado para os demais arquivos de teste.
beforeAll(async () => {
  await sql.unsafe("DROP SCHEMA IF EXISTS app CASCADE");
});
afterAll(async () => {
  await runMigrations(sql);
  await close();
});

describe("runMigrations", () => {
  it("aplica 0001_init.sql na primeira vez e nada na segunda", async () => {
    expect(await runMigrations(sql)).toEqual(["0001_init.sql"]);
    expect(await runMigrations(sql)).toEqual([]);
    const [row] = await sql<{ r: string | null }[]>`SELECT to_regclass('app.transactions')::text AS r`;
    expect(row?.r).not.toBeNull();
  });

  it("roda como role sem CREATE no banco quando o schema já existe", async () => {
    const role = "cash_migrator_test";
    const pw = "migrator_test_pw";
    await sql.unsafe(`DROP ROLE IF EXISTS ${role}`);
    await sql.unsafe(`CREATE ROLE ${role} LOGIN PASSWORD '${pw}'`);
    try {
      await sql.unsafe(`GRANT USAGE, CREATE ON SCHEMA app TO ${role}`);
      await sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO ${role}`);
      const u = new URL(url);
      u.username = role;
      u.password = pw;
      const restricted = createDb(u.toString());
      try {
        expect(await runMigrations(restricted.sql)).toEqual([]);
      } finally {
        await restricted.close();
      }
    } finally {
      await sql.unsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA app FROM ${role}`);
      await sql.unsafe(`REVOKE ALL ON SCHEMA app FROM ${role}`);
      await sql.unsafe(`DROP ROLE ${role}`);
    }
  });

  it("rejeita lançamento cujo tipo difere do tipo da categoria", async () => {
    const [u] = await sql<{ id: string }[]>`
      INSERT INTO app.users (email, name) VALUES ('a@b.com', 'A') RETURNING id`;
    const [c] = await sql<{ id: string }[]>`
      INSERT INTO app.categories (user_id, name, type, icon, color)
      VALUES (${u!.id}, 'Mercado', 'expense', 'ShoppingCart', '#fff') RETURNING id`;
    await expect(
      sql`INSERT INTO app.transactions (user_id, category_id, type, amount_cents, occurred_on)
          VALUES (${u!.id}, ${c!.id}, 'income', 100, '2026-01-01')`,
    ).rejects.toThrow(/tipo/i);
    await sql`INSERT INTO app.transactions (user_id, category_id, type, amount_cents, occurred_on)
              VALUES (${u!.id}, ${c!.id}, 'expense', 100, '2026-01-01')`;
  });

  it("resetDb esvazia as tabelas sem apagar o controle de migrations", async () => {
    await resetDb(sql);
    const [t] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM app.transactions`;
    const [u] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM app.users`;
    const [m] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM app.schema_migrations`;
    expect([t!.n, u!.n]).toEqual([0, 0]);
    expect(m!.n).toBe(1);
  });
});
