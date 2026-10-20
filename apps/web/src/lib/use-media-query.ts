import { useSyncExternalStore } from "react";

/** SSR-safe: o servidor (e a hidratação) assumem `false` (mobile). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia?.(query);
      mql?.addEventListener("change", notify);
      return () => mql?.removeEventListener("change", notify);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
