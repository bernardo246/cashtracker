import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHero } from "@/features/auth/AuthHero";
import { ResetForm } from "@/features/auth/ResetForm";

export const metadata: Metadata = { title: "Redefinir senha · Cash Tracker" };

export default function Page() {
  return (
    <>
      <AuthHero title="Nova senha" subtitle="Escolha uma nova senha para a sua conta." />
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
