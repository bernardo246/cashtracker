import type { MonthlyReport } from "@cash/shared";

export type MonthlyItem = MonthlyReport["items"][number];

export interface ChartDatum {
  month: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
}

const short = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });

/** "2026-10" → "out" (o Intl pode devolver "out." com ponto). */
export function shortMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return short.format(new Date(Date.UTC(y, m - 1, 1))).replace(/\.$/, "");
}

export function toChartData(items: MonthlyItem[]): ChartDatum[] {
  return items.map((i) => ({
    month: i.month,
    label: shortMonth(i.month),
    income: i.incomeCents,
    expense: i.expenseCents,
    balance: i.balanceCents,
  }));
}
