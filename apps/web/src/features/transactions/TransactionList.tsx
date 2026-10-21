"use client";

import { formatBrl, monthLabel, type TransactionDto, type TransactionType } from "@cash/shared";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { useTransactions } from "./queries";
import { useTransactionSheet } from "./TransactionSheetProvider";

const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function dayLabel(iso: string): string {
  return dayFmt.format(new Date(`${iso}T00:00:00Z`));
}

function signed(cents: number): string {
  if (cents === 0) return formatBrl(0);
  return `${cents > 0 ? "+" : "−"} ${formatBrl(Math.abs(cents))}`;
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
  if (q.isError) {
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
      {groups.map((g) => (
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
            </span>
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {g.items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => sheet.open(t)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left outline-none hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-elevated"
                    style={{ color: t.category.color }}
                  >
                    <CategoryIcon name={t.category.icon} className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{t.category.name}</span>
                    {t.description && <span className="truncate text-sm text-text-secondary">{t.description}</span>}
                  </span>
                  <span data-amount className={cn("num shrink-0", t.type === "income" ? "text-success" : "text-danger")}>
                    <span className="sr-only">{t.type === "income" ? "Entrada" : "Saída"}</span>
                    {signed(t.type === "income" ? t.amountCents : -t.amountCents)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
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
