"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WakingBanner } from "@/features/shell/WakingBanner";
import { makeQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/lib/session";
import { HydrationMarker } from "./hydration-marker";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [slow, setSlow] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationMarker />
      <SessionProvider onSlow={setSlow}>
        <WakingBanner visible={slow} />
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
}
