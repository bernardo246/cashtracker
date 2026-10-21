"use client";

import type { TransactionType } from "@cash/shared";
import { cn } from "@/lib/utils";
import { useAllCategories } from "./queries";

interface TransactionFiltersProps {
  type?: TransactionType;
  categoryId?: string;
  onTypeChange: (type: TransactionType | undefined) => void;
  onCategoryChange: (categoryId: string | undefined) => void;
}

const TYPES: { value: TransactionType | undefined; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "income", label: "Entradas" },
  { value: "expense", label: "Saídas" },
];

export function TransactionFilters({ type, categoryId, onTypeChange, onCategoryChange }: TransactionFiltersProps) {
  const categories = useAllCategories();
  const options = (categories.data ?? []).filter((c) => !type || c.type === type);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Tipo" className="flex gap-1 rounded-(--radius-pill) border border-border bg-surface p-1">
        {TYPES.map((t) => (
          <button
            key={t.label}
            type="button"
            aria-pressed={type === t.value}
            onClick={() => onTypeChange(t.value)}
            className={cn(
              "h-9 rounded-(--radius-pill) px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
              type === t.value ? "bg-primary text-primary-foreground" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <select
        aria-label="Categoria"
        value={categoryId ?? ""}
        onChange={(e) => onCategoryChange(e.target.value || undefined)}
        className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <option value="">Todas as categorias</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.archived ? " (arquivada)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
