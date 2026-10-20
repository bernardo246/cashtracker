"use client";

import { Plus } from "lucide-react";
import { useTransactionSheet } from "@/features/transactions/TransactionSheetProvider";
import { cn } from "@/lib/utils";

export function Fab() {
  const { open } = useTransactionSheet();
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label="Novo lançamento"
      className={cn(
        "fixed right-(--page-gutter) bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] z-40 inline-flex h-14 min-w-14 items-center justify-center gap-2 rounded-(--radius-pill) bg-primary px-5 font-medium text-primary-foreground shadow-lg outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden",
      )}
    >
      <Plus className="size-6" aria-hidden="true" />
    </button>
  );
}
