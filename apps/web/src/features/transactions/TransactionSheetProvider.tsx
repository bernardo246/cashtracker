"use client";

import type { TransactionDto } from "@cash/shared";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { TransactionSheet } from "./TransactionSheet";

interface SheetApi {
  open: (tx?: TransactionDto) => void;
}

const Ctx = createContext<SheetApi | null>(null);

export function TransactionSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [transaction, setTransaction] = useState<TransactionDto | undefined>();
  const open = useCallback((tx?: TransactionDto) => {
    setTransaction(tx);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <TransactionSheet open={isOpen} onOpenChange={setOpen} transaction={transaction} />
    </Ctx.Provider>
  );
}

export function useTransactionSheet(): SheetApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransactionSheet deve ser usado dentro de TransactionSheetProvider");
  return ctx;
}
