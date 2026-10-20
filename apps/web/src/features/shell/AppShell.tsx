"use client";

import type { ReactNode } from "react";
import { TransactionSheetProvider } from "@/features/transactions/TransactionSheetProvider";
import { BottomNav } from "./BottomNav";
import { Fab } from "./Fab";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TransactionSheetProvider>
      <Sidebar />
      <main className="min-h-dvh px-(--page-gutter) pt-6 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-10 md:pl-[calc(4rem+var(--page-gutter))] lg:pl-[calc(15rem+var(--page-gutter))]">
        {children}
      </main>
      <BottomNav />
      <Fab />
    </TransactionSheetProvider>
  );
}
