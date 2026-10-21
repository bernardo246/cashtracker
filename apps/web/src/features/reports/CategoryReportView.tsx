"use client";

import { currentMonthSaoPaulo, formatBrl, isMonthKey, monthLabel, type TransactionType } from "@cash/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionSheet } from "@/features/transactions/TransactionSheetProvider";
import { CategoryBarChart } from "./CategoryBarChart";
import { ChartTable } from "./ChartTable";
import { categoryLabel, formatShare } from "./format";
import { MonthPicker } from "./MonthPicker";
import { useByCategory } from "./queries";

const COPY = {
  expense: { eyebrow: "GASTOS", empty: "Nenhum gasto em", color: "var(--color-danger)", caption: "Gastos por categoria" },
  income: { eyebrow: "ENTRADAS", empty: "Nenhuma entrada em", color: "var(--color-success)", caption: "Entradas por categoria" },
} as const;

export function CategoryReportView({ type }: { type: TransactionType }) {
  const copy = COPY[type];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sheet = useTransactionSheet();
  const [asTable, setAsTable] = useState(false);

  const mesParam = params.get("mes");
  const anoParam = params.get("ano");
  const month = mesParam && isMonthKey(mesParam) ? mesParam : currentMonthSaoPaulo();
  const year = anoParam && /^\d{4}$/.test(anoParam) ? Number(anoParam) : undefined;
  const periodText = year !== undefined ? String(year) : monthLabel(month);

  const q = useByCategory(type, year !== undefined ? { year } : { month });

  function go(next: URLSearchParams) {
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  function selectMonth(m: string) {
    go(new URLSearchParams({ mes: m }));
  }
  function toggleYear() {
    go(new URLSearchParams(year !== undefined ? { mes: month } : { ano: month.slice(0, 4) }));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-widest text-text-secondary">{copy.eyebrow}</p>
        <p className="num text-display" style={{ color: copy.color }}>
          {q.data ? formatBrl(q.data.totalCents) : "—"}
        </p>
        <MonthPicker value={month} onChange={selectMonth} allowYear yearSelected={year !== undefined} onYearToggle={toggleYear} />
      </header>

      {q.isPending ? (
        <div role="status" aria-label="Carregando relatório" className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : q.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 py-8">
          <p className="text-text-secondary">Não foi possível carregar o relatório.</p>
          <Button variant="secondary" onClick={() => void q.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : q.data.items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-8">
          <p className="text-text-secondary">
            {copy.empty} {periodText}.
          </p>
          <Button onClick={() => sheet.open()}>Registrar lançamento</Button>
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
              Ver como tabela
            </Button>
          </div>
          {asTable ? (
            <ChartTable
              caption={`${copy.caption} — ${periodText}`}
              columns={[{ label: "Categoria" }, { label: "Valor", numeric: true }, { label: "Parte do total", numeric: true }]}
              rows={q.data.items.map((i) => [categoryLabel(i), formatBrl(i.totalCents), formatShare(i.share)])}
            />
          ) : (
            <CategoryBarChart items={q.data.items} color={copy.color} label={`${copy.caption}, ${periodText}`} />
          )}
        </section>
      )}
    </div>
  );
}
