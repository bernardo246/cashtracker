export function WakingBanner({ visible }: { visible: boolean }) {
  return (
    <div role="status" aria-live="polite">
      {visible ? (
        <p className="fixed inset-x-0 top-0 z-50 border-b border-border bg-surface-elevated px-4 py-2 text-center text-sm text-text-secondary">
          Acordando o servidor…
        </p>
      ) : null}
    </div>
  );
}
