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

  async function send(path: string, init: RequestOptions = {}): Promise<Response> {
    const { json, headers: h, ...rest } = init;
    const headers = new Headers(h);
    if (json !== undefined) headers.set("content-type", "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);
    try {
      return await doFetch(`/api${path}`, {
        ...rest,
        headers,
        credentials: "same-origin",
        body: json !== undefined ? JSON.stringify(json) : rest.body,
      });
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

  function refresh(): Promise<AuthResponse | null> {
    inflightRefresh ??= (async () => {
      try {
        const res = await send("/auth/refresh", { method: "POST" });
        if (!res.ok) {
          token = null;
          return null;
        }
        const data = (await res.json()) as AuthResponse;
        setAccessToken(data.accessToken);
        return data;
      } catch {
        token = null;
        return null;
      } finally {
        inflightRefresh = null;
      }
    })();
    return inflightRefresh;
  }

  async function run<T>(path: string, init?: RequestOptions): Promise<T> {
    const res = await send(path, init);
    if (res.status !== 401 || path.startsWith("/auth/")) return parse<T>(res);
    if (!(await refresh())) {
      notifyLost();
      return parse<T>(res);
    }
    const retry = await send(path, init);
    if (retry.status === 401) notifyLost();
    return parse<T>(retry);
  }

  async function request<T>(path: string, init?: RequestOptions): Promise<T> {
    let slow = false;
    const timer = setTimeout(() => {
      slow = true;
      if (slowCount++ === 0) opts.onSlow?.(true);
    }, slowAfterMs);
    try {
      return await run<T>(path, init);
    } finally {
      clearTimeout(timer);
      if (slow && --slowCount === 0) opts.onSlow?.(false);
    }
  }

  return { request, setAccessToken, refresh };
}
