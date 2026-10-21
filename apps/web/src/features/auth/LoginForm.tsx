"use client";

import { loginInput } from "@cash/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useSession } from "@/lib/session";
import { Field, FormAlert, FormNotice } from "./Field";
import { GoogleButton } from "./GoogleButton";
import { PasswordField } from "./PasswordField";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";
import { formValues, validate } from "./validation";

const GOOGLE_ERROR = "Não foi possível entrar com o Google. Tente novamente.";

export function LoginForm() {
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const { pending, error, fields, submit } = useAuthForm();

  const alert = error ?? (params.get("erro") === "google" ? GOOGLE_ERROR : null);
  const reset = params.get("redefinida") === "1";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data, errors } = validate(loginInput, formValues(e.currentTarget), { password: "Informe a senha" });
    const ok = await submit(errors, async () => session.login(data!.email, data!.password));
    if (ok) router.replace("/visao-geral");
  }

  return (
    <div className="flex flex-col gap-6">
      {reset ? <FormNotice>Senha redefinida. Entre com a nova senha.</FormNotice> : null}
      {alert ? <FormAlert>{alert}</FormAlert> : null}
      <form method="post" onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5">
        <Field name="email" label="E-mail" type="email" autoComplete="email" inputMode="email" error={fields.email} />
        <PasswordField name="password" label="Senha" autoComplete="current-password" error={fields.password} />
        <Link href="/esqueci-senha" className="self-start py-2 text-sm text-primary hover:underline">
          Esqueceu a sua senha?
        </Link>
        <SubmitButton pending={pending} label="Entrar" pendingLabel="Entrando…" />
      </form>
      <p className="text-center text-sm text-text-muted">ou</p>
      <GoogleButton />
      <p className="text-center text-sm text-text-secondary">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="py-2 font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
