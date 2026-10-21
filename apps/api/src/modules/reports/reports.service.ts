import type { ByCategoryQuery, ByCategoryReport, MonthlyReport } from "@cash/shared";
import { currentMonthSaoPaulo } from "@cash/shared";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type postgres from "postgres";
import type { Db } from "../../db/client.js";
import { categories, transactions } from "../../db/schema.js";

/** [início, fim) como datas ISO, para o mês (YYYY-MM) ou o ano inteiro. */
function periodRange(q: ByCategoryQuery): { from: string; to: string } {
  if (q.year !== undefined) return { from: `${q.year}-01-01`, to: `${q.year + 1}-01-01` };
  const [y, m] = q.month!.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: `${q.month}-01`, to: `${next}-01` };
}

type MonthlyRow = { month: string; income_cents: string | number; expense_cents: string | number };

export function createReportService(db: Db, sqlClient: postgres.Sql, now: () => Date = () => new Date()) {
  return {
    async byCategory(userId: string, q: ByCategoryQuery): Promise<ByCategoryReport> {
      const { from, to } = periodRange(q);
      const total = sql<string>`sum(${transactions.amountCents})`;
      const rows = await db
        .select({
          categoryId: categories.id,
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
          archivedAt: categories.archivedAt,
          total,
        })
        .from(transactions)
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, q.type),
            gte(transactions.occurredOn, from),
            lt(transactions.occurredOn, to),
          ),
        )
        .groupBy(categories.id, categories.name, categories.icon, categories.color, categories.archivedAt)
        .orderBy(desc(total), categories.name);

      // SUM de bigint vem como numérico (string): valores limitados pelo teto de negócio, cabem em number
      const totals = rows.map((r) => Number(r.total));
      const periodTotal = totals.reduce((s, n) => s + n, 0);
      const period = q.year !== undefined ? { year: q.year } : { month: q.month! };
      const items = rows.map((r, i) => ({
          categoryId: r.categoryId,
          name: r.name,
          icon: r.icon,
          color: r.color,
          archived: r.archivedAt !== null,
          totalCents: totals[i]!,
          share: Math.round((totals[i]! / periodTotal) * 10000) / 10000,
        }));
      return periodTotal > 0 ? { period, totalCents: periodTotal, items } : { period, totalCents: 0, items: [] };
    },

    async monthly(userId: string, months: number): Promise<MonthlyReport> {
      const current = currentMonthSaoPaulo(now());
      // parâmetros tipados explicitamente: o postgres.js não infere tipos para `$1 || '-01'`
      const rows = await sqlClient<MonthlyRow[]>`
        WITH months AS (
          SELECT to_char(m, 'YYYY-MM') AS month, m::date AS start, (m + interval '1 month')::date AS end
          FROM generate_series((${current}::text || '-01')::date - make_interval(months => ${months}::int - 1), (${current}::text || '-01')::date, interval '1 month') AS m
        )
        SELECT months.month,
               COALESCE(SUM(t.amount_cents) FILTER (WHERE t.type = 'income'), 0)::bigint  AS income_cents,
               COALESCE(SUM(t.amount_cents) FILTER (WHERE t.type = 'expense'), 0)::bigint AS expense_cents
        FROM months
        LEFT JOIN app.transactions t ON t.user_id = ${userId}::uuid AND t.occurred_on >= months.start AND t.occurred_on < months.end
        GROUP BY months.month ORDER BY months.month`;
      return {
        items: rows.map((r) => {
          const incomeCents = Number(r.income_cents);
          const expenseCents = Number(r.expense_cents);
          return { month: r.month, incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
        }),
      };
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
