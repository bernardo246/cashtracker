import { render, screen, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "./query-client";
import { SessionProvider, useSession, type Session } from "./session";

const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={makeQueryClient()}>
    <SessionProvider>{ui}</SessionProvider>
  </QueryClientProvider>
);

const user = { id: "u1", name: "Ana", email: "a@a.com" };

function Probe() {
  const { status, user: u } = useSession();
  return <div data-testid="s">{status}:{u?.name ?? "-"}</div>;
}

function stubFetch(status: number, body?: unknown) {
  const fn = vi.fn(() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
    ),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("SessionProvider", () => {
  it("refresh OK -> authenticated", async () => {
    const f = stubFetch(200, { accessToken: "t", user });
    render(wrap(<Probe />));
    expect(screen.getByTestId("s")).toHaveTextContent("loading:-");
    await waitFor(() => expect(screen.getByTestId("s")).toHaveTextContent("authenticated:Ana"));
    expect((f.mock.calls as unknown[][])[0]?.[0]).toBe("/api/auth/refresh");
  });

  it("refresh 401 -> anonymous", async () => {
    stubFetch(401, { error: { code: "INVALID_REFRESH", message: "x", requestId: "r" } });
    render(wrap(<Probe />));
    await waitFor(() => expect(screen.getByTestId("s")).toHaveTextContent("anonymous:-"));
  });

  it("503 transitório no mount: tenta de novo e autentica", async () => {
    vi.useFakeTimers();
    let n = 0;
    const f = vi.fn(() => {
      n++;
      return Promise.resolve(
        n <= 2
          ? new Response("{}", { status: 503 })
          : new Response(JSON.stringify({ accessToken: "t", user }), { status: 200 }),
      );
    });
    vi.stubGlobal("fetch", f);
    render(wrap(<Probe />));
    await act(() => vi.advanceTimersByTimeAsync(3100));
    expect(screen.getByTestId("s")).toHaveTextContent("authenticated:Ana");
    expect(f).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("401 no mount não faz novas tentativas", async () => {
    const f = stubFetch(401, { error: { code: "INVALID_REFRESH", message: "x", requestId: "r" } });
    render(wrap(<Probe />));
    await waitFor(() => expect(screen.getByTestId("s")).toHaveTextContent("anonymous:-"));
    expect(f).toHaveBeenCalledTimes(1);
  });

  describe("cache de queries", () => {
    const routed = (handlers: Record<string, () => Response>) =>
      vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(handlers[url]!())));
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    function setup() {
      const client = makeQueryClient();
      const holder: { current?: Session } = {};
      function Grab() {
        const session = useSession();
        useEffect(() => {
          holder.current = session;
        });
        return <div data-testid="s">{session.status}:{session.user?.id ?? "-"}</div>;
      }
      render(
        <QueryClientProvider client={client}>
          <SessionProvider>
            <Grab />
          </SessionProvider>
        </QueryClientProvider>,
      );
      return { client, get: () => holder.current! };
    }

    it("perda de sessão limpa o cache", async () => {
      let refreshes = 0;
      routed({
        "/api/auth/refresh": () => (++refreshes === 1 ? json(200, { accessToken: "t", user }) : json(401, { error: { code: "X", message: "x", requestId: "r" } })),
        "/api/x": () => json(401, { error: { code: "X", message: "x", requestId: "r" } }),
      });
      const { client, get } = setup();
      await waitFor(() => expect(screen.getByTestId("s")).toHaveTextContent("authenticated:u1"));
      client.setQueryData(["k"], "dados do Ana");
      await act(() => get().api.request("/x").catch(() => undefined));
      await waitFor(() => expect(screen.getByTestId("s")).toHaveTextContent("anonymous:-"));
      expect(client.getQueryData(["k"])).toBeUndefined();
    });

    it("login com outro usuário limpa o cache; com o mesmo, mantém", async () => {
      const other = { id: "u2", name: "Bia", email: "b@b.com" };
      let next = other;
      routed({
        "/api/auth/refresh": () => json(200, { accessToken: "t", user }),
        "/api/auth/login": () => json(200, { accessToken: "t2", user: next }),
      });
      const { client, get } = setup();
      await waitFor(() => expect(screen.getByTestId("s")).toHaveTextContent("authenticated:u1"));
      client.setQueryData(["k"], "dados do Ana");
      next = user;
      await act(() => get().login("a@a.com", "pw"));
      expect(client.getQueryData(["k"])).toBe("dados do Ana");
      next = other;
      await act(() => get().login("b@b.com", "pw"));
      expect(screen.getByTestId("s")).toHaveTextContent("authenticated:u2");
      expect(client.getQueryData(["k"])).toBeUndefined();
    });
  });
});
