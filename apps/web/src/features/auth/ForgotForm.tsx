"use client";

import { forgotPasswordInput } from "@cash/shared";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSession } from "@/lib/session";
import { Field, FormAlert, FormNotice } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";
import { formValues, validate } from "./validation";

export function ForgotForm() {
  const { api } = useSession();
  const { pending, error, fields, submit } = useAuthForm();
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data, errors } = validate(forgotPasswordInput, formValues(e.currentTarget));
    const ok = await submit(errors, async () => {
      await api.request("/auth/forgot-password", { method: "POST", json: data });
    });
    if (ok) setSent(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {sent ? <FormNotice>Se o e-mail existir, enviamos um link. Confira também a caixa de spam.</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5">
        <Field name="email" label="E-mail" type="email" autoComplete="email" inputMode="email" error={fields.email} />
        <SubmitButton pending={pending} label="Enviar link" pendingLabel="Enviando…" />
      </form>
      <Link href="/login" className="self-center py-2 text-sm text-primary hover:underline">
        Voltar para o login
      </Link>
    </div>
  );
}
