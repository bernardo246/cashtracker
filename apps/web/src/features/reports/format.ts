import type { ByCategoryReport } from "@cash/shared";

const pct = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatShare(share: number): string {
  return pct.format(share);
}

export function categoryLabel(item: ByCategoryReport["items"][number]): string {
  return item.archived ? `${item.name} (arquivada)` : item.name;
}
