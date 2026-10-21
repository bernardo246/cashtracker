"use client";

import { monthLabel, type TransactionDto, type TransactionType } from "@cash/shared";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTransactions } from "./queries";
import { signed, TransactionRow } from "./TransactionRow";
import { useTransactionSheet } from "./TransactionSheetProvider";

const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function dayLabel(iso: string): string {
  return dayFmt.format(new Date(`${iso}T00:00:00Z`));
}

interface DayGroup {
  day: string;
  items: TransactionDto[];
  totalCents: number;
}

function groupByDay(items: TransactionDto[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const t of items) {
    let g = groups[groups.length - 1];
    if (!g || g.day !== t.occurredOn) {
      g = { day: t.occurredOn, items: [], totalCents: 0 };
      groups.push(g);
    }
    g.items.push(t);
    g.totalCents += t.type === "income" ? t.amountCents : -t.amountCents;
  }
  return groups;
}

interface TransactionListProps {
  month: string;
  type?: TransactionType;
  categoryId?: string;
}

export function TransactionList({ month, type, categoryId }: TransactionListProps) {
  const sheet = useTransactionSheet();
  const q = useTransactions({ month, type, categoryId });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const groups = useMemo(() => groupByDay(q.data?.pages.flatMap((p) => p.items) ?? []), [q.data]);

  if (q.isPending) {
    return (
      <div role="status" aria-label="Carregando lançamentos" className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (q.isError && !q.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-8">
        <p className="text-text-secondary">Não foi possível carregar os lançamentos.</p>
        <Button variant="secondary" onClick={() => void q.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-8">
        <p className="text-text-secondary">Nenhum lançamento em {monthLabel(month)}.</p>
        <Button onClick={() => sheet.open()}>Registrar lançamento</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g, i) => (
        <section key={g.day}>
          <h3 className="mb-2 flex items-baseline justify-between text-sm font-medium text-text-secondary">
            <span className="first-letter:uppercase">{dayLabel(g.day)}</span>
            <span
              className={cn(
                "num",
                g.totalCents > 0 && "text-success",
                g.totalCents < 0 && "text-danger",
              )}
            >
              {signed(g.totalCents)}
              {hasNextPage && i === groups.length - 1 && (
                <>
                  <span className="ml-1 text-xs font-normal text-text-secondary">(parcial)</span>
                  <span className="sr-only">: faltam lançamentos deste dia na próxima página</span>
                </>
              )}
            </span>
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {g.items.map((t) => (
              <TransactionRow key={t.id} transaction={t} onSelect={sheet.open} />
            ))}
          </ul>
        </section>
      ))}
      {q.isFetchNextPageError && (
        <div role="alert" className="flex flex-col items-center gap-2 text-center">
          <p className="text-text-secondary">Não foi possível carregar mais lançamentos.</p>
          <Button variant="secondary" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            Tentar de novo
          </Button>
        </div>
      )}
      {hasNextPage && (
        <div ref={sentinel} className="flex justify-center">
          <Button variant="secondary" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
