"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/visao-geral");
    else if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  return (
    <div role="status" aria-label="Carregando" className="flex min-h-dvh flex-col gap-4 p-(--page-gutter)">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
