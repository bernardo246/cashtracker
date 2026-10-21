"use client";

import { formatBrl, type ByCategoryReport } from "@cash/shared";
import { useEffect, useState } from "react";
import { CategoryIcon } from "@/features/transactions/category-icon";
import { categoryLabel, formatShare } from "./format";

interface CategoryBarChartProps {
  items: ByCategoryReport["items"];
  color: string;
  label: string;
}

/** Barras horizontais em HTML/CSS: legíveis em qualquer largura e acessíveis (os valores estão no texto). */
export function CategoryBarChart({ items, color, label }: CategoryBarChartProps) {
  // a largura parte de 0 para a transição aparecer; sob movimento reduzido a duração global é 0
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ol aria-label={label} className="flex flex-col gap-3">
      {items.map((i) => {
        const pct = i.totalCents > 0 ? Math.max(i.share * 100, 2) : 0;
        return (
          <li key={i.categoryId} className="flex min-h-11 flex-col justify-center gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span data-name className="flex min-w-0 items-center gap-2 truncate text-sm">
                <CategoryIcon name={i.icon} className="size-4 shrink-0 text-text-secondary" />
                <span className="truncate">{categoryLabel(i)}</span>
              </span>
              <span data-value className="num shrink-0 text-sm">
                {formatBrl(i.totalCents)} · {formatShare(i.share)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated" aria-hidden="true">
              <div
                data-bar
                className="h-full rounded-full"
                style={{
                  width: `${shown ? pct : 0}%`,
                  background: color,
                  transition: "width var(--motion-slow) var(--ease-editorial)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
