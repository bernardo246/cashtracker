import { formatBrl, monthLabel } from "@cash/shared";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonthlyItem } from "./monthly-data";

function monthName(month: string): string {
  // "outubro de 2026" → "OUTUBRO"
  return (monthLabel(month).split(" de ")[0] ?? "").toLocaleUpperCase("pt-BR");
}

function StatCard({ id, label, cents, tone }: { id: string; label: string; cents: number; tone: "success" | "danger" }) {
  return (
    <div data-testid={id} className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-widest text-text-secondary">{label}</p>
      <p className={cn("num text-2xl", cents > 0 && (tone === "success" ? "text-success" : "text-danger"))}>{formatBrl(cents)}</p>
    </div>
  );
}

export function SummaryCards({ month }: { month: MonthlyItem }) {
  const b = month.balanceCents;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 md:p-6">
        <p className="text-xs font-medium tracking-widest text-text-secondary">SALDO DE {monthName(month.month)}</p>
        <p
          data-testid="balance"
          className={cn("num flex items-center gap-3 text-display", b > 0 && "text-success", b < 0 && "text-danger")}
        >
          {b !== 0 && (
            <>
              {b > 0 ? (
                <TrendingUp aria-hidden="true" className="size-[0.6em] shrink-0" />
              ) : (
                <TrendingDown aria-hidden="true" className="size-[0.6em] shrink-0" />
              )}
              <span className="sr-only">{b > 0 ? "Saldo positivo" : "Saldo negativo"}</span>
            </>
          )}
          {b > 0 && "+"}
          {b < 0 && "−"}
          {formatBrl(Math.abs(b))}
        </p>
      </div>
      <StatCard id="income" label="Ganhos" cents={month.incomeCents} tone="success" />
      <StatCard id="expense" label="Gastos" cents={month.expenseCents} tone="danger" />
    </div>
  );
}
