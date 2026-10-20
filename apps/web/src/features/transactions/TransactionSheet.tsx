"use client";

import { formatBrl, parseBrlToCents, todaySaoPaulo, type CategoryDto, type TransactionDto, type TransactionType } from "@cash/shared";
import { LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Field, FormAlert } from "@/features/auth/Field";
import { ApiError } from "@/lib/api-client";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { AmountInput } from "./AmountInput";
import { CategoryChips } from "./CategoryChips";
import { useCategories, useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from "./queries";

export interface TransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TransactionDto;
}

export function TransactionSheet({ open, onOpenChange, transaction }: TransactionSheetProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const title = transaction ? "Editar lançamento" : "Novo lançamento";
  const focusAmount = (e: Event) => {
    e.preventDefault();
    document.getElementById("amount")?.focus();
  };
  const form = <TransactionForm transaction={transaction} onDone={() => onOpenChange(false)} />;

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onOpenAutoFocus={focusAmount} className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Preencha os dados do lançamento</DialogDescription>
          {form}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent onOpenAutoFocus={focusAmount}>
        <DrawerTitle className="px-4 pt-4 text-lg">{title}</DrawerTitle>
        <DrawerDescription className="sr-only">Preencha os dados do lançamento</DrawerDescription>
        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{form}</div>
      </DrawerContent>
    </Drawer>
  );
}

function centsToText(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function TransactionForm({ transaction, onDone }: { transaction?: TransactionDto; onDone: () => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.category.id ?? null);
  const [amount, setAmount] = useState(transaction ? centsToText(transaction.amountCents) : "");
  const [occurredOn, setOccurredOn] = useState(transaction?.occurredOn ?? todaySaoPaulo());
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const categories = useCategories(type);
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const pending = create.isPending || update.isPending || remove.isPending;

  // Na edição a categoria atual aparece mesmo arquivada.
  const chips: CategoryDto[] = categories.data ?? [];
  const current = transaction?.category;
  const withCurrent =
    current && transaction.type === type && !chips.some((c) => c.id === current.id)
      ? [{ ...current, type, archived: true }, ...chips]
      : chips;

  const changeType = (next: TransactionType) => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
  };

  const fail = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
    } else {
      setFormError("Não foi possível concluir. Tente novamente.");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const amountCents = parseBrlToCents(amount);
    if (amountCents === null) next.amountCents = "Informe um valor válido";
    if (!categoryId) next.categoryId = "Escolha uma categoria";
    if (!occurredOn) next.occurredOn = "Informe a data";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0 || amountCents === null || !categoryId) return;

    const input = { type, categoryId, amountCents, occurredOn, description: description.trim() || null };
    try {
      if (transaction) await update.mutateAsync({ id: transaction.id, input });
      else await create.mutateAsync(input);
      toast.success("Lançamento salvo");
      onDone();
    } catch (err) {
      fail(err);
    }
  };

  const confirmDelete = async () => {
    if (!transaction) return;
    setFormError(null);
    try {
      await remove.mutateAsync(transaction.id);
      toast.success("Lançamento excluído");
      onDone();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-5 pt-2">
      <div role="group" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-md border border-border bg-surface p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => changeType(t)}
            className={cn(
              "min-h-11 rounded-sm text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
              type === t
                ? t === "expense"
                  ? "bg-danger/20 text-danger"
                  : "bg-primary/20 text-primary"
                : "text-text-secondary",
            )}
          >
            {t === "expense" ? "Saída" : "Entrada"}
          </button>
        ))}
      </div>

      <AmountInput value={amount} onChange={setAmount} error={errors.amountCents} />

      <CategoryChips
        categories={withCurrent}
        value={categoryId}
        onChange={setCategoryId}
        loading={categories.isPending}
        error={errors.categoryId}
      />
      {categories.isError ? <FormAlert>Não foi possível carregar as categorias.</FormAlert> : null}

      <Field
        name="occurredOn"
        label="Data"
        type="date"
        value={occurredOn}
        onChange={(e) => setOccurredOn(e.target.value)}
        error={errors.occurredOn}
      />
      <Field
        name="description"
        label="Descrição (opcional)"
        maxLength={140}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
      />

      {formError ? <FormAlert>{formError}</FormAlert> : null}

      {confirmingDelete ? (
        <div role="alertdialog" aria-label="Confirmar exclusão" className="flex flex-col gap-3 rounded-md border border-danger/40 bg-danger/10 p-3">
          <p className="text-sm">Excluir este lançamento?</p>
          <p className="sr-only">{formatBrl(transaction?.amountCents ?? 0)}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setConfirmingDelete(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" className="flex-1" onClick={() => void confirmDelete()} disabled={pending}>
              Excluir
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button type="submit" size="pill" disabled={pending} className="w-full">
            {create.isPending || update.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            Salvar
          </Button>
          {transaction ? (
            <Button type="button" variant="ghost" className="w-full text-danger" onClick={() => setConfirmingDelete(true)} disabled={pending}>
              Excluir
            </Button>
          ) : null}
        </div>
      )}
    </form>
  );
}
