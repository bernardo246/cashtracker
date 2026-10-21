import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHero } from "@/features/auth/AuthHero";
import { RegisterForm } from "@/features/auth/RegisterForm";

export const metadata: Metadata = { title: "Criar conta · Cash Tracker" };

export default function Page() {
  return (
    <>
      <AuthHero title="Crie sua conta" subtitle="Comece a controlar seu dinheiro em poucos minutos." />
      <Suspense>
        <RegisterForm />
      </Suspense>
    </>
  );
}
