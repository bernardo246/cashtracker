import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHero } from "@/features/auth/AuthHero";
import { ForgotForm } from "@/features/auth/ForgotForm";

export const metadata: Metadata = { title: "Esqueci a senha · Cash Tracker" };

export default function Page() {
  return (
    <>
      <AuthHero title="Esqueceu a senha?" subtitle="Informe seu e-mail e enviaremos um link para redefinir." />
      <Suspense>
        <ForgotForm />
      </Suspense>
    </>
  );
}
