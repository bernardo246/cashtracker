"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/visao-geral");
  }, [status, router]);

  // Durante "loading" o formulário já aparece, para não piscar.
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-10 px-(--page-gutter) py-10">
      {children}
    </main>
  );
}
