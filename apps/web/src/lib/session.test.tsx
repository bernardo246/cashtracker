import { render, screen, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "./query-client";
import { SessionProvider, useSession } from "./session";

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
});
