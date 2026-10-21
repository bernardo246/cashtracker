"use client";

import { useEffect } from "react";

/** Sinaliza que o React hidratou (usado pelo E2E); inofensivo em produção. */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}
