import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHero } from "@/features/auth/AuthHero";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "Entrar · Cash Tracker" };

export default function Page() {
  return (
    <>
      <AuthHero title="Entre na sua conta" subtitle="Acompanhe suas entradas e saídas em um só lugar." />
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
