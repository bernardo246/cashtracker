import type { ReactNode } from "react";
import { CategoryManager } from "@/features/settings/CategoryManager";
import { InstallAppButton } from "@/features/settings/InstallAppButton";
import { ProfileForm } from "@/features/settings/ProfileForm";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      <Section title="Perfil">
        <ProfileForm />
      </Section>
      <Section title="Categorias">
        <CategoryManager />
      </Section>
      <InstallAppButton />
    </div>
  );
}
