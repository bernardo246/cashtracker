"use client";

import { formatBrl, monthLabel } from "@cash/shared";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTable } from "./ChartTable";
import { toChartData, type MonthlyItem } from "./monthly-data";

// Recharts mede o DOM: só no cliente. O skeleton tem a mesma altura do gráfico.
const MonthlyChartCanvas = dynamic(() => import("./MonthlyChartCanvas"), {
  ssr: false,
  loading: () => <Skeleton className="h-60 w-full" />,
});

const LABEL = "Ganhos, gastos e diferença nos últimos 12 meses";

export function MonthlyChart({ items }: { items: MonthlyItem[] }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Últimos 12 meses</h2>
        <Button variant="secondary" size="sm" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
          Ver como tabela
        </Button>
      </div>
      {asTable ? (
        <ChartTable
          caption={LABEL}
          columns={[{ label: "Mês" }, { label: "Ganhos", numeric: true }, { label: "Gastos", numeric: true }, { label: "Diferença", numeric: true }]}
          rows={items.map((i) => [monthLabel(i.month), formatBrl(i.incomeCents), formatBrl(i.expenseCents), formatBrl(i.balanceCents)])}
        />
      ) : (
        <div role="img" aria-label={LABEL} className="flex flex-col gap-2">
          <MonthlyChartCanvas data={toChartData(items)} />
          <ul aria-hidden="true" data-testid="legend" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-xs bg-success" />
              Ganhos
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-xs bg-danger" />
              Gastos
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-info" />
              Diferença
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
