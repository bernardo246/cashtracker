import type { MonthlyReport, TransactionDto, TransactionPage } from "@cash/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionMock, sessionValue } from "@/features/auth/test-utils";
import { OverviewView } from "./OverviewView";

vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));
const open = vi.fn();
vi.mock("@/features/transactions/TransactionSheetProvider", () => ({ useTransactionSheet: () => ({ open }) }));
vi.mock("./MonthlyChart", () => ({ MonthlyChart: ({ items }: { items: unknown[] }) => <div data-testid="chart">{items.length}</div> }));

const monthly: MonthlyReport = {
  items: Array.from({ length: 12 }, (_, i) => ({
    month: i < 2 ? `2025-${i + 11}` : `2026-${String(i - 1).padStart(2, "0")}`,
    incomeCents: 0,
    expenseCents: 0,
    balanceCents: 0,
  })),
};
monthly.items[11] = { month: "2026-10", incomeCents: 10000, expenseCents: 15000, balanceCents: -5000 };

const tx = (id: string): TransactionDto => ({
  id, type: "expense", amountCents: 1000, occurredOn: "2026-10-20", description: null,
  category: { id: "c", name: `Cat ${id}`, icon: "Wallet", color: "#fff" },
});

function respond(txs: TransactionDto[], opts: { monthlyFail?: boolean } = {}) {
  sessionMock.request.mockImplementation((path: string) => {
    if (path.startsWith("/reports/monthly")) return opts.monthlyFail ? Promise.reject(new Error("x")) : Promise.resolve(monthly);
    return Promise.resolve({ items: txs, nextCursor: null } satisfies TransactionPage);
  });
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OverviewView />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  open.mockReset();
  sessionMock.request.mockReset();
});

describe("OverviewView", () => {
  it("busca 12 meses e 5 lançamentos; mostra saldo do mês corrente (último item) e o gráfico", async () => {
    respond([tx("1")]);
    renderView();
    expect((await screen.findByTestId("balance")).textContent).toMatch(/−R\$\s50,00/);
    expect(screen.getByTestId("chart")).toHaveTextContent("12");
    expect(sessionMock.request).toHaveBeenCalledWith("/reports/monthly?months=12");
    expect(sessionMock.request).toHaveBeenCalledWith("/transactions?limit=5");
  });

  it("lista os últimos 5 lançamentos com link 'Ver todos' para /lancamentos", async () => {
    respond(["1", "2", "3", "4", "5"].map(tx));
    renderView();
    const list = await screen.findByRole("list", { name: "Últimos lançamentos" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute("href", "/lancamentos");
    await userEvent.click(within(list).getByRole("button", { name: /Cat 2/ }));
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }));
  });

  it("sem lançamentos: cards zerados continuam e a lista mostra o vazio com CTA", async () => {
    respond([]);
    renderView();
    expect(await screen.findByText("Nenhum lançamento ainda.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Registrar lançamento" }));
    expect(open).toHaveBeenCalledWith();
  });

  it("erro no relatório mostra 'Tentar de novo' que refaz a busca", async () => {
    respond([], { monthlyFail: true });
    renderView();
    const retry = await screen.findByRole("button", { name: "Tentar de novo" });
    const calls = sessionMock.request.mock.calls.filter(([p]) => String(p).startsWith("/reports/monthly")).length;
    await userEvent.click(retry);
    await vi.waitFor(() =>
      expect(sessionMock.request.mock.calls.filter(([p]) => String(p).startsWith("/reports/monthly")).length).toBeGreaterThan(calls),
    );
  });
});
