"use client";

import { registerInput } from "@cash/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useSession } from "@/lib/session";
import { Field, FormAlert } from "./Field";
import { GoogleButton } from "./GoogleButton";
import { PasswordField } from "./PasswordField";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";
import { formValues, validate } from "./validation";

export function RegisterForm() {
  const session = useSession();
  const router = useRouter();
  const { pending, error, fields, submit } = useAuthForm();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data, errors } = validate(registerInput, formValues(e.currentTarget));
    const ok = await submit(errors, async () => session.register(data!));
    if (ok) router.replace("/visao-geral");
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <form method="post" onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5">
        <Field name="name" label="Nome" autoComplete="name" error={fields.name} />
        <Field name="email" label="E-mail" type="email" autoComplete="email" inputMode="email" error={fields.email} />
        <PasswordField
          name="password"
          label="Senha"
          autoComplete="new-password"
          hint="De 8 a 128 caracteres"
          error={fields.password}
        />
        <SubmitButton pending={pending} label="Criar conta" pendingLabel="Criando…" />
      </form>
      <p className="text-center text-sm text-text-muted">ou</p>
      <GoogleButton />
      <p className="text-center text-sm text-text-secondary">
        Já tem conta?{" "}
        <Link href="/login" className="py-2 font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
