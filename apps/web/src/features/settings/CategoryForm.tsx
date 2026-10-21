"use client";

import {
  CATEGORY_COLORS, CATEGORY_ICONS, categoryCreateInput, categoryUpdateInput,
  type CategoryDto, type TransactionType,
} from "@cash/shared";
import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Field, FormAlert } from "@/features/auth/Field";
import { SubmitButton } from "@/features/auth/SubmitButton";
import { useAuthForm } from "@/features/auth/useAuthForm";
import { validate } from "@/features/auth/validation";
import { CategoryIcon } from "@/features/transactions/category-icon";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { useCreateCategory, useUpdateCategory } from "./queries";

export interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TransactionType;
  category?: CategoryDto;
}

export function CategoryForm({ open, onOpenChange, type, category }: CategoryFormProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const title = category ? "Editar categoria" : "Nova categoria";
  const form = <Form type={type} category={category} onDone={() => onOpenChange(false)} />;

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Defina nome, ícone e cor da categoria</DialogDescription>
          {form}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="px-4 pt-4 text-lg">{title}</DrawerTitle>
        <DrawerDescription className="sr-only">Defina nome, ícone e cor da categoria</DrawerDescription>
        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{form}</div>
      </DrawerContent>
    </Drawer>
  );
}

function Form({ type, category, onDone }: { type: TransactionType; category?: CategoryDto; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<string>(category?.icon ?? CATEGORY_ICONS[0]);
  const [color, setColor] = useState<string>(category?.color ?? CATEGORY_COLORS[0]);
  const { pending, error, fields, submit } = useAuthForm();
  const create = useCreateCategory();
  const update = useUpdateCategory();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const overrides = { name: "Informe o nome (até 40 caracteres)" };
    const created = category ? null : validate(categoryCreateInput, { name, type, icon, color }, overrides);
    const updated = category ? validate(categoryUpdateInput, { name, icon, color }, overrides) : null;
    const errors = created?.errors ?? updated?.errors ?? {};
    const ok = await submit(errors, async () => {
      if (category && updated?.data) await update.mutateAsync({ id: category.id, input: updated.data });
      else if (created?.data) await create.mutateAsync(created.data);
    });
    if (ok) {
      toast.success("Categoria salva");
      onDone();
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5 pt-2">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <Field
        name="name"
        label="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        autoComplete="off"
        error={fields.name}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Ícone</legend>
        <div className="grid grid-cols-5 gap-2">
          {CATEGORY_ICONS.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={i}
              aria-pressed={icon === i}
              onClick={() => setIcon(i)}
              className={cn(
                "flex size-11 items-center justify-center justify-self-center rounded-md border border-border text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary",
                icon === i && "border-primary bg-primary/15 text-primary",
              )}
            >
              <CategoryIcon name={i} className="size-5" />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Cor</legend>
        <div className="grid grid-cols-5 gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={cn(
                "flex size-11 items-center justify-center justify-self-center rounded-full border-2 border-transparent text-background outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                color === c && "border-text-primary",
              )}
            >
              {color === c ? <Check className="size-5" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </fieldset>
      <SubmitButton pending={pending} label="Salvar" pendingLabel="Salvando…" />
    </form>
  );
}
