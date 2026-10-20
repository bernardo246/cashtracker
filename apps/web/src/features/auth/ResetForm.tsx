"use client";

import { resetPasswordInput } from "@cash/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useSession } from "@/lib/session";
import { FormAlert } from "./Field";
import { PasswordField } from "./PasswordField";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";
import { formValues, validate } from "./validation";

const INVALID_LINK = "Link inválido ou expirado";

export function ResetForm() {
  const { api } = useSession();
  const router = useRouter();
  const token = useSearchParams().get("token");
  const { pending, error, errorCode, fields, submit } = useAuthForm();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = formValues(e.currentTarget);
    const { data, errors } = validate(resetPasswordInput, { token, password: values.password });
    if (!errors.password && values.password !== values.confirm) errors.confirm = "As senhas não coincidem";
    const ok = await submit(errors, async () => {
      await api.request("/auth/reset-password", { method: "POST", json: data });
    });
    if (ok) router.replace("/login?redefinida=1");
  }

  const linkInvalid = !token || errorCode === "INVALID_RESET_TOKEN";
  const alert = !token ? INVALID_LINK : error;

  return (
    <div className="flex flex-col gap-6">
      {alert ? <FormAlert>{alert}</FormAlert> : null}
      {linkInvalid ? (
        <Link href="/esqueci-senha" className="self-start py-2 text-sm font-medium text-primary hover:underline">
          Pedir um novo
        </Link>
      ) : null}
      {token ? (
        <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5">
          <PasswordField
            name="password"
            label="Nova senha"
            autoComplete="new-password"
            hint="De 8 a 128 caracteres"
            error={fields.password}
          />
          <PasswordField name="confirm" label="Confirmar nova senha" autoComplete="new-password" error={fields.confirm} />
          <SubmitButton pending={pending} label="Redefinir senha" pendingLabel="Redefinindo…" />
        </form>
      ) : null}
    </div>
  );
}
