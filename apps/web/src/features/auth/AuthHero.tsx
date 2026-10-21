export function AuthHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex flex-col gap-4">
      <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">CONTROLE FINANCEIRO</p>
      <h1 className="text-(length:--text-display) leading-(--text-display--line-height) font-bold tracking-tight text-balance">
        {title}
      </h1>
      {subtitle ? <p className="text-base text-text-secondary">{subtitle}</p> : null}
    </header>
  );
}
