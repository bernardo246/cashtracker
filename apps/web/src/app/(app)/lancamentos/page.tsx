"use client";

import { currentMonthSaoPaulo, isMonthKey, type TransactionType } from "@cash/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MonthPicker } from "@/features/reports/MonthPicker";
import { TransactionFilters } from "@/features/transactions/TransactionFilters";
import { TransactionList } from "@/features/transactions/TransactionList";

const TIPO: Record<string, TransactionType> = { entrada: "income", saida: "expense" };
const TIPO_PARAM: Record<TransactionType, string> = { income: "entrada", expense: "saida" };

function Lancamentos() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const mesParam = params.get("mes");
  const month = mesParam && isMonthKey(mesParam) ? mesParam : currentMonthSaoPaulo();
  const type = TIPO[params.get("tipo") ?? ""];
  const categoryId = params.get("categoria") ?? undefined;

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Lançamentos</h1>
      <MonthPicker value={month} onChange={(m) => update({ mes: m })} />
      <TransactionFilters
        type={type}
        categoryId={categoryId}
        // trocar o tipo limpa a categoria, que pode não pertencer ao novo tipo
        onTypeChange={(t) => update({ tipo: t && TIPO_PARAM[t], categoria: undefined })}
        onCategoryChange={(c) => update({ categoria: c })}
      />
      <TransactionList month={month} type={type} categoryId={categoryId} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Lancamentos />
    </Suspense>
  );
}
