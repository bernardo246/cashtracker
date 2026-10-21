import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./api-client";

const user = { id: "u1", name: "Ana", email: "a@a.com" };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const apiError = (status: number, code: string, extra: object = {}) =>
  json(status, { error: { code, message: "x", requestId: "r", ...extra } });

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function mockFetch(handler: Handler) {
  return vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve(handler(url, init ?? {})),
  );
}

const asFetch = (f: ReturnType<typeof mockFetch>) => f as unknown as typeof fetch;
const authOf = (init: RequestInit) => new Headers(init.headers).get("authorization");

describe("createApiClient", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("deduplica o refresh em 3 requisições paralelas com 401", async () => {
    const fetchFn = mockFetch((url, init) => {
      if (url === "/api/auth/refresh") return json(200, { accessToken: "new", user });
      return authOf(init) === "Bearer new" ? json(200, { ok: true }) : apiError(401, "INVALID_TOKEN");
    });
    const onSessionLost = vi.fn();
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost });
    api.setAccessToken("old");

    const res = await Promise.all([api.request("/a"), api.request("/b"), api.request("/c")]);

    expect(res).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    const calls = fetchFn.mock.calls;
    expect(calls.filter(([u]) => u === "/api/auth/refresh")).toHaveLength(1);
    expect(calls.filter(([, init]) => init && authOf(init) === "Bearer new")).toHaveLength(3);
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it("refresh não envia content-type sem corpo", async () => {
    const fetchFn = mockFetch(() => json(200, { accessToken: "t", user }));
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost: vi.fn() });
    await api.refresh();
    const init = fetchFn.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has("content-type")).toBe(false);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
  });

  it("refresh falho chama onSessionLost uma vez", async () => {
    const fetchFn = mockFetch((url) =>
      url === "/api/auth/refresh" ? apiError(401, "INVALID_REFRESH") : apiError(401, "INVALID_TOKEN"),
    );
    const onSessionLost = vi.fn();
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost });
    api.setAccessToken("old");

    const results = await Promise.allSettled([api.request("/a"), api.request("/b")]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it("não tenta refresh em rotas /auth/*", async () => {
    const fetchFn = mockFetch(() => apiError(401, "INVALID_CREDENTIALS"));
    const onSessionLost = vi.fn();
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost });
    await expect(api.request("/auth/login", { method: "POST", json: { a: 1 } })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it("repete apenas uma vez", async () => {
    const fetchFn = mockFetch((url) =>
      url === "/api/auth/refresh" ? json(200, { accessToken: "n", user }) : apiError(401, "INVALID_TOKEN"),
    );
    const onSessionLost = vi.fn();
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost });
    await expect(api.request("/a")).rejects.toBeInstanceOf(ApiError);
    expect(fetchFn).toHaveBeenCalledTimes(3); // /a, refresh, /a
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it("onSlow(true) após 3s e onSlow(false) ao terminar", async () => {
    const fetchFn = mockFetch(
      () => new Promise<Response>((resolve) => setTimeout(() => resolve(json(200, { ok: 1 })), 3500)),
    );
    const onSlow = vi.fn();
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost: vi.fn(), onSlow });
    const p = api.request("/slow");
    await vi.advanceTimersByTimeAsync(2999);
    expect(onSlow).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(onSlow).toHaveBeenCalledWith(true);
    await vi.advanceTimersByTimeAsync(600);
    await p;
    expect(onSlow.mock.calls).toEqual([[true], [false]]);
  });

  it("onSlow só volta a false quando todas as lentas terminam", async () => {
    const fetchFn = mockFetch(
      (url) =>
        new Promise<Response>((resolve) => setTimeout(() => resolve(json(200, {})), url === "/api/a" ? 4000 : 6000)),
    );
    const onSlow = vi.fn();
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost: vi.fn(), onSlow });
    const pa = api.request("/a");
    const pb = api.request("/b");
    await vi.advanceTimersByTimeAsync(4100);
    await pa;
    expect(onSlow.mock.calls).toEqual([[true]]);
    await vi.advanceTimersByTimeAsync(2000);
    await pb;
    expect(onSlow.mock.calls).toEqual([[true], [false]]);
  });

  it("400 com fields vira ApiError com fields", async () => {
    const fetchFn = mockFetch(() => apiError(400, "VALIDATION_ERROR", { fields: { email: "E-mail inválido" } }));
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost: vi.fn() });
    const err = await api.request("/x", { method: "POST", json: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: "VALIDATION_ERROR", fields: { email: "E-mail inválido" } });
  });

  it("204 retorna undefined; json envia content-type e corpo", async () => {
    const fetchFn = mockFetch(() => new Response(null, { status: 204 }));
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost: vi.fn() });
    await expect(api.request("/x", { method: "DELETE" })).resolves.toBeUndefined();
    await api.request("/y", { method: "POST", json: { a: 1 } });
    const init = fetchFn.mock.calls[1]?.[1];
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    expect(init?.body).toBe('{"a":1}');
  });

  it("falha de rede vira ApiError NETWORK_ERROR", async () => {
    const fetchFn = vi.fn(() => Promise.reject(new TypeError("failed")));
    const api = createApiClient({ fetchFn, onSessionLost: vi.fn() });
    await expect(api.request("/x")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Sem conexão. Tente novamente.",
    });
  });

  it("401 atrasado com token antigo repete sem novo refresh", async () => {
    const fetchFn = mockFetch((url, init) => {
      if (url === "/api/auth/refresh") return json(200, { accessToken: "new", user });
      if (authOf(init) === "Bearer new") return json(200, { ok: true });
      if (url === "/api/a") return new Promise((r) => setTimeout(() => r(apiError(401, "INVALID_TOKEN")), 100));
      return apiError(401, "INVALID_TOKEN");
    });
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost: vi.fn() });
    api.setAccessToken("old");
    const pa = api.request("/a");
    await api.request("/b");
    await vi.advanceTimersByTimeAsync(150);
    await expect(pa).resolves.toEqual({ ok: true });
    expect(fetchFn.mock.calls.filter(([u]) => u === "/api/auth/refresh")).toHaveLength(1);
  });

  it("refresh com 503 propaga o erro, mantém o token e não chama onSessionLost", async () => {
    const fetchFn = mockFetch((url, init) =>
      url === "/api/auth/refresh"
        ? apiError(503, "UNAVAILABLE")
        : authOf(init) === "Bearer old"
          ? apiError(401, "INVALID_TOKEN")
          : json(200, {}),
    );
    const onSessionLost = vi.fn();
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost });
    api.setAccessToken("old");
    await expect(api.request("/a")).rejects.toMatchObject({ status: 503 });
    expect(onSessionLost).not.toHaveBeenCalled();
    await expect(api.request("/b")).rejects.toMatchObject({ status: 503 }); // ainda usa o token antigo
  });

  it("refresh público passa pelo onSlow", async () => {
    const fetchFn = mockFetch(
      () => new Promise<Response>((r) => setTimeout(() => r(json(200, { accessToken: "t", user })), 3500)),
    );
    const onSlow = vi.fn();
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost: vi.fn(), onSlow });
    const p = api.refresh();
    await vi.advanceTimersByTimeAsync(3600);
    await p;
    expect(onSlow.mock.calls).toEqual([[true], [false]]);
  });

  it("retry ainda 401 limpa o token", async () => {
    const fetchFn = mockFetch((url) =>
      url === "/api/auth/refresh" ? json(200, { accessToken: "n", user }) : apiError(401, "INVALID_TOKEN"),
    );
    const api = createApiClient({ fetchFn: asFetch(fetchFn), onSessionLost: vi.fn() });
    await expect(api.request("/a")).rejects.toBeInstanceOf(ApiError);
    await api.request("/b").catch(() => undefined);
    const last = fetchFn.mock.calls.at(-1)?.[1];
    expect(authOf(last ?? {})).toBe("Bearer n"); // refresh renovou de novo; token anterior havia sido limpo
  });
});
