"use client";

import type { AuthResponse, UserDto } from "@cash/shared";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createApiClient, type ApiClient } from "./api-client";

type Status = "loading" | "authenticated" | "anonymous";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface Session {
  status: Status;
  user: UserDto | null;
  login(email: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  api: ApiClient;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children, onSlow }: { children: ReactNode; onSlow?: (slow: boolean) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<UserDto | null>(null);

  const [api] = useState(() =>
    createApiClient({
      onSessionLost: () => {
        setUser(null);
        setStatus("anonymous");
      },
      onSlow, // capturado uma vez: deve ser estável (ex.: setState)
    }),
  );

  useEffect(() => {
    let active = true;
    void api.refresh().then((data) => {
      if (!active) return;
      setUser(data?.user ?? null);
      setStatus(data ? "authenticated" : "anonymous");
    });
    return () => {
      active = false;
    };
  }, [api]);

  const authenticate = useCallback(
    async (path: string, body: unknown) => {
      const data = await api.request<AuthResponse>(path, { method: "POST", json: body });
      api.setAccessToken(data.accessToken);
      setUser(data.user);
      setStatus("authenticated");
    },
    [api],
  );

  const login = useCallback((email: string, password: string) => authenticate("/auth/login", { email, password }), [authenticate]);
  const register = useCallback((input: RegisterInput) => authenticate("/auth/register", input), [authenticate]);

  const logout = useCallback(async () => {
    try {
      await api.request("/auth/logout", { method: "POST" });
    } finally {
      api.setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
      queryClient.clear();
    }
  }, [api, queryClient]);

  const value = useMemo<Session>(
    () => ({ status, user, login, register, logout, api }),
    [status, user, login, register, logout, api],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession deve ser usado dentro de SessionProvider");
  return ctx;
}
