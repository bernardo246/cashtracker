"use client";

import { Download, Share } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "./useInstallPrompt";

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Instalar app</h2>
      {children}
    </section>
  );
}

/** Cartão "Instalar app" de /ajustes; some quando já instalado ou sem suporte. */
export function InstallAppButton() {
  const { platform, install } = useInstallPrompt();

  if (platform === "prompt") {
    return (
      <Card>
        <Button onClick={() => void install()} className="w-full sm:w-fit">
          <Download aria-hidden="true" />
          Instalar app
        </Button>
      </Card>
    );
  }
  if (platform === "ios") {
    return (
      <Card>
        <div className="flex items-start gap-3 text-sm text-text-secondary">
          <Share aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>Toque em Compartilhar e depois em &apos;Adicionar à Tela de Início&apos;</p>
        </div>
      </Card>
    );
  }
  return null;
}
