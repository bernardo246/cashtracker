"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTransactionSheet } from "@/features/transactions/TransactionSheetProvider";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS } from "./nav-items";

// Recolhida (só ícones + tooltip) de 768 a 1023px; completa a partir de 1024px.
export function Sidebar() {
  const pathname = usePathname();
  const { open } = useTransactionSheet();
  return (
    <TooltipProvider delayDuration={200}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col gap-4 border-r border-border bg-surface p-2 md:flex lg:w-60 lg:p-4">
        <p className="hidden px-3 pt-2 text-lg font-semibold lg:block">Cash Tracker</p>
        <nav aria-label="Navegação principal">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        aria-label={label}
                        className={cn(
                          "flex h-11 items-center justify-center gap-3 rounded-md text-sm outline-none transition-colors hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-primary lg:justify-start lg:px-3",
                          active ? "bg-surface-elevated text-primary" : "text-text-secondary",
                        )}
                      >
                        <Icon className="size-5 shrink-0" aria-hidden="true" />
                        <span className="hidden lg:inline">{label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="lg:hidden">
                      {label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>
        <Button onClick={() => open()} aria-label="Novo lançamento" className="mt-auto w-full lg:gap-2">
          <Plus aria-hidden="true" />
          <span className="hidden lg:inline">Novo lançamento</span>
        </Button>
      </aside>
    </TooltipProvider>
  );
}
