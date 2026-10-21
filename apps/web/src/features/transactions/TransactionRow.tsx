"use client";

import { formatBrl, type TransactionDto } from "@cash/shared";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

export function signed(cents: number): string {
  if (cents === 0) return formatBrl(0);
  return `${cents > 0 ? "+" : "−"} ${formatBrl(Math.abs(cents))}`;
}

interface TransactionRowProps {
  transaction: TransactionDto;
  onSelect: (t: TransactionDto) => void;
}

/** Item de lançamento (um `<li>`), compartilhado entre a lista do mês e a Visão geral. */
export function TransactionRow({ transaction: t, onSelect }: TransactionRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(t)}
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
  );
}
