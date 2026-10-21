"use client";

import type { CategoryDto, TransactionType } from "@cash/shared";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormAlert } from "@/features/auth/Field";
import { CategoryIcon } from "@/features/transactions/category-icon";
import { ApiError } from "@/lib/api-client";
import { CategoryForm } from "./CategoryForm";
import { useDeleteCategory, useManagedCategories, useUpdateCategory } from "./queries";

type FormState = { category?: CategoryDto } | null;

export function CategoryManager() {
  const [type, setType] = useState<TransactionType>("expense");
  const [form, setForm] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Tipo de categoria">
            <TabsTrigger value="expense">Saídas</TabsTrigger>
            <TabsTrigger value="income">Entradas</TabsTrigger>
          </TabsList>
          <Button variant="secondary" onClick={() => setForm({})}>
            <Plus aria-hidden="true" />
            Nova categoria
          </Button>
        </div>
        {(["expense", "income"] as const).map((t) => (
          <TabsContent key={t} value={t} className="mt-1">
            <CategoryList type={t} onEdit={(category) => setForm({ category })} onDelete={setDeleting} />
          </TabsContent>
        ))}
      </Tabs>
      {form ? (
        <CategoryForm
          key={form.category?.id ?? "new"}
          open
          onOpenChange={(o) => !o && setForm(null)}
          type={type}
          category={form.category}
        />
      ) : null}
      {deleting ? <DeleteDialog category={deleting} onClose={() => setDeleting(null)} /> : null}
    </div>
  );
}

function CategoryList({
  type, onEdit, onDelete,
}: {
  type: TransactionType;
  onEdit: (c: CategoryDto) => void;
  onDelete: (c: CategoryDto) => void;
}) {
  const query = useManagedCategories(type);
  const update = useUpdateCategory();

  if (query.isPending) {
    return (
      <div role="status" aria-label="Carregando categorias" className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <FormAlert>Não foi possível carregar as categorias.</FormAlert>
        <Button variant="secondary" onClick={() => void query.refetch()}>Tentar de novo</Button>
      </div>
    );
  }

  async function toggleArchive(c: CategoryDto) {
    try {
      await update.mutateAsync({ id: c.id, input: { archived: !c.archived } });
      toast.success(c.archived ? "Categoria desarquivada" : "Categoria arquivada");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Algo deu errado. Tente novamente.");
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {query.data.map((c) => (
        <li key={c.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${c.color}26`, color: c.color }}
          >
            <CategoryIcon name={c.icon} className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate font-medium">{c.name}</span>
            {c.archived ? (
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary">
                Arquivada
              </span>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" aria-label={`Editar ${c.name}`} onClick={() => onEdit(c)}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${c.archived ? "Desarquivar" : "Arquivar"} ${c.name}`}
            disabled={update.isPending}
            onClick={() => void toggleArchive(c)}
          >
            {c.archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Excluir ${c.name}`} onClick={() => onDelete(c)}>
            <Trash2 aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function DeleteDialog({ category, onClose }: { category: CategoryDto; onClose: () => void }) {
  const remove = useDeleteCategory();
  const update = useUpdateCategory();
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const pending = remove.isPending || update.isPending;

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null);
    try {
      await action();
      toast.success(done);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: "Algo deu errado. Tente novamente." },
      );
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Excluir categoria</DialogTitle>
        <DialogDescription>
          Excluir &ldquo;{category.name}&rdquo;? Esta ação não pode ser desfeita.
        </DialogDescription>
        {error ? <FormAlert>{error.message}</FormAlert> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancelar</Button>
          {error?.code === "CATEGORY_IN_USE" ? (
            <Button
              disabled={pending}
              onClick={() =>
                void run(() => update.mutateAsync({ id: category.id, input: { archived: true } }), "Categoria arquivada")
              }
            >
              Arquivar
            </Button>
          ) : (
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => void run(() => remove.mutateAsync(category.id), "Categoria excluída")}
            >
              Excluir
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
