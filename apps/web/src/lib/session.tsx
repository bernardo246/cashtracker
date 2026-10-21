"use client";

import type { AuthResponse, UserDto } from "@cash/shared";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  /** Atualiza o usuário em memória (ex.: após editar o nome). */
  updateUser: (user: UserDto) => void;
  api: ApiClient;
}

const RESTORE_BACKOFF_MS = [1000, 2000, 4000];

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children, onSlow }: { children: ReactNode; onSlow?: (slow: boolean) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<UserDto | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Troca de usuário (ou perda de sessão) nunca pode expor dados em cache do anterior.
  const adopt = useCallback(
    (next: UserDto | null) => {
      if (userIdRef.current !== null && userIdRef.current !== (next?.id ?? null)) queryClient.clear();
      userIdRef.current = next?.id ?? null;
      setUser(next);
    },
    [queryClient],
  );

  const [api] = useState(() =>
    createApiClient({
      onSessionLost: () => {
        queryClient.clear();
        setUser(null);
        setStatus("anonymous");
      },
      onSlow, // capturado uma vez: deve ser estável (ex.: setState)
    }),
  );

  useEffect(() => {
    let active = true;
    const settle = (data: AuthResponse | null) => {
      if (!active) return;
      adopt(data?.user ?? null);
      setStatus(data ? "authenticated" : "anonymous");
    };
    // Falhas transitórias (rede/5xx/429): até 3 novas tentativas com 1s, 2s, 4s.
    void (async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          settle(await api.refresh());
          return;
        } catch {
          if (attempt >= RESTORE_BACKOFF_MS.length) return settle(null);
          await new Promise((r) => setTimeout(r, RESTORE_BACKOFF_MS[attempt]));
          if (!active) return;
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [api, adopt]);

  const authenticate = useCallback(
    async (path: string, body: unknown) => {
      const data = await api.request<AuthResponse>(path, { method: "POST", json: body });
      api.setAccessToken(data.accessToken);
      adopt(data.user);
      setStatus("authenticated");
    },
    [api, adopt],
  );

  const login = useCallback((email: string, password: string) => authenticate("/auth/login", { email, password }), [authenticate]);
  const register = useCallback((input: RegisterInput) => authenticate("/auth/register", input), [authenticate]);

  const logout = useCallback(async () => {
    try {
      await api.request("/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Falha ao encerrar a sessão no servidor", err);
    } finally {
      api.setAccessToken(null);
      userIdRef.current = null;
      setUser(null);
      setStatus("anonymous");
      queryClient.clear();
    }
  }, [api, queryClient]);

  const updateUser = useCallback((next: UserDto) => setUser(next), []);

  const value = useMemo<Session>(
    () => ({ status, user, login, register, logout, updateUser, api }),
    [status, user, login, register, logout, updateUser, api],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession deve ser usado dentro de SessionProvider");
  return ctx;
}
