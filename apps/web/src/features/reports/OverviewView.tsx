"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentTransactions } from "@/features/transactions/queries";
import { TransactionRow } from "@/features/transactions/TransactionRow";
import { useTransactionSheet } from "@/features/transactions/TransactionSheetProvider";
import { MonthlyChart } from "./MonthlyChart";
import { useMonthlyReport } from "./queries";
import { SummaryCards } from "./SummaryCards";

function RecentTransactions() {
  const sheet = useTransactionSheet();
  const q = useRecentTransactions(5);
  const items = q.data?.items ?? [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Últimos lançamentos</h2>
        {items.length > 0 && (
          <Link
            href="/lancamentos"
            className="inline-flex min-h-11 items-center text-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ver todos
          </Link>
        )}
      </div>
      {q.isPending ? (
        <div role="status" aria-label="Carregando lançamentos" className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : q.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 py-4">
          <p className="text-text-secondary">Não foi possível carregar os lançamentos.</p>
          <Button variant="secondary" onClick={() => void q.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-4">
          <p className="text-text-secondary">Nenhum lançamento ainda.</p>
          <Button onClick={() => sheet.open()}>Registrar lançamento</Button>
        </div>
      ) : (
        <ul aria-label="Últimos lançamentos" className="divide-y divide-border rounded-lg border border-border bg-surface">
          {items.map((t) => (
            <TransactionRow key={t.id} transaction={t} onSelect={sheet.open} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function OverviewView() {
  const q = useMonthlyReport(12);
  const current = q.data?.items.at(-1);

  return (
    <div className="flex flex-col gap-8">
      {q.isPending ? (
        <div role="status" aria-label="Carregando visão geral" className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : q.isError || !current ? (
        <div role="alert" className="flex flex-col items-start gap-3 py-8">
          <p className="text-text-secondary">Não foi possível carregar a visão geral.</p>
          <Button variant="secondary" onClick={() => void q.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <>
          <SummaryCards month={current} />
          <MonthlyChart items={q.data.items} />
        </>
      )}
      <RecentTransactions />
    </div>
  );
}
