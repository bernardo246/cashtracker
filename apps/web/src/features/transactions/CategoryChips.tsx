import type { CategoryDto } from "@cash/shared";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

export interface CategoryChipsProps {
  categories: CategoryDto[];
  value: string | null;
  onChange: (id: string) => void;
  loading?: boolean;
  error?: string;
}

export function CategoryChips({ categories, value, onChange, loading, error }: CategoryChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <span id="category-label" className="text-sm font-medium">
        Categoria
      </span>
      <div role="radiogroup" aria-labelledby="category-label" className="flex flex-wrap gap-2">
        {loading ? <span className="text-sm text-text-muted">Carregando categorias…</span> : null}
        {categories.map((c) => {
          const checked = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(c.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-(--radius-pill) border px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                checked ? "border-primary bg-primary/15 text-text-primary" : "border-border text-text-secondary hover:bg-surface",
              )}
            >
              <CategoryIcon name={c.icon} className="size-4" />
              {c.name}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
