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
        <div role="img" aria-label={LABEL}>
          <MonthlyChartCanvas data={toChartData(items)} />
        </div>
      )}
    </section>
  );
}
