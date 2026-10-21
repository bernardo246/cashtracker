import type { ApiErrorBody, AuthResponse } from "@cash/shared";

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export type RequestOptions = RequestInit & { json?: unknown };

export interface ApiClient {
  request<T>(path: string, init?: RequestOptions): Promise<T>;
  setAccessToken(token: string | null): void;
  refresh(): Promise<AuthResponse | null>;
}

export interface ApiClientOptions {
  fetchFn?: typeof fetch;
  onSessionLost: () => void;
  onSlow?: (slow: boolean) => void;
  slowAfterMs?: number;
}

const NETWORK_MESSAGE = "Sem conexão. Tente novamente.";

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const slowAfterMs = opts.slowAfterMs ?? 3000;
  const doFetch: typeof fetch = (...args) => (opts.fetchFn ?? fetch)(...args);
  let token: string | null = null;
  let inflightRefresh: Promise<AuthResponse | null> | null = null;
  let lostNotified = false;
  let slowCount = 0;

  const setAccessToken = (t: string | null) => {
    token = t;
    if (t) lostNotified = false;
  };

  const notifyLost = () => {
    if (lostNotified) return;
    lostNotified = true;
    opts.onSessionLost();
  };

  async function send(path: string, init: RequestOptions = {}): Promise<{ res: Response; sent: string | null }> {
    const { json, headers: h, ...rest } = init;
    const headers = new Headers(h);
    if (json !== undefined) headers.set("content-type", "application/json");
    const sent = token;
    if (sent) headers.set("authorization", `Bearer ${sent}`);
    try {
      const res = await doFetch(`/api${path}`, {
        ...rest,
        headers,
        credentials: "same-origin",
        body: json !== undefined ? JSON.stringify(json) : rest.body,
      });
      return { res, sent };
    } catch {
      throw new ApiError(0, "NETWORK_ERROR", NETWORK_MESSAGE);
    }
  }

  async function parse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    if (res.ok) return (await res.json()) as T;
    const body = await res.json().then(
      (b: Partial<ApiErrorBody>) => b,
      () => null,
    );
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? "UNKNOWN", e?.message ?? "Erro inesperado.", e?.fields);
  }

  // Só 401/403 significam "sem sessão"; qualquer outra falha propaga e mantém o token.
  function refreshShared(): Promise<AuthResponse | null> {
    inflightRefresh ??= (async () => {
      try {
        const { res } = await send("/auth/refresh", { method: "POST" });
        if (res.status === 401 || res.status === 403) {
          token = null;
          return null;
        }
        const data = await parse<AuthResponse>(res);
        setAccessToken(data.accessToken);
        return data;
      } finally {
        inflightRefresh = null;
      }
    })();
    return inflightRefresh;
  }

  async function run<T>(path: string, init?: RequestOptions): Promise<T> {
    const { res, sent } = await send(path, init);
    if (res.status !== 401 || path.startsWith("/auth/")) return parse<T>(res);
    // Outro pedido já renovou o token enquanto este estava em voo: repete sem novo refresh.
    if (token === null || token === sent) {
      if (!(await refreshShared())) {
        notifyLost();
        return parse<T>(res);
      }
    }
    const retry = (await send(path, init)).res;
    if (retry.status === 401) {
      token = null;
      notifyLost();
    }
    return parse<T>(retry);
  }

  async function tracked<T>(fn: () => Promise<T>): Promise<T> {
    let slow = false;
    const timer = setTimeout(() => {
      slow = true;
      if (slowCount++ === 0) opts.onSlow?.(true);
    }, slowAfterMs);
    try {
      return await fn();
    } finally {
      clearTimeout(timer);
      if (slow && --slowCount === 0) opts.onSlow?.(false);
    }
  }

  const refresh = () => tracked(refreshShared);
  const request = <T,>(path: string, init?: RequestOptions) => tracked(() => run<T>(path, init));

  return { request, setAccessToken, refresh };
}
