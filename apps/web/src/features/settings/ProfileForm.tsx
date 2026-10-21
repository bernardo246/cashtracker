"use client";

import { updateMeInput } from "@cash/shared";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/features/auth/Field";
import { SubmitButton } from "@/features/auth/SubmitButton";
import { useAuthForm } from "@/features/auth/useAuthForm";
import { validate } from "@/features/auth/validation";
import { useSession } from "@/lib/session";
import { useUpdateProfile } from "./queries";

export function ProfileForm() {
  const session = useSession();
  const { user } = session;
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const { pending, error, fields, submit } = useAuthForm();
  const update = useUpdateProfile();

  if (!user) return null;
  const methods = [user.hasGoogle ? "Google" : null, user.hasPassword ? "Senha" : null].filter(Boolean);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = validate(updateMeInput, { name });
    const ok = await submit(errors, async () => {
      if (data) await update.mutateAsync(data.name);
    });
    if (ok) toast.success("Nome atualizado");
  }

  async function onLogout() {
    await session.logout();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
        {error ? <FormAlert>{error}</FormAlert> : null}
        <Field
          name="name"
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="name"
          error={fields.name}
        />
        <SubmitButton pending={pending} label="Salvar nome" pendingLabel="Salvando…" />
      </form>
      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-text-secondary">E-mail</dt>
          <dd className="break-all">{user.email}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Métodos de login</dt>
          <dd>{methods.join(" · ")}</dd>
        </div>
      </dl>
      <Button variant="secondary" size="pill" onClick={() => void onLogout()} className="w-full sm:w-fit">
        <LogOut aria-hidden="true" />
        Sair
      </Button>
    </div>
  );
}
