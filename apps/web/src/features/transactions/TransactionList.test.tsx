import type { TransactionDto, TransactionPage } from "@cash/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionMock, sessionValue } from "@/features/auth/test-utils";
import { TransactionList } from "./TransactionList";

vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));
const open = vi.fn();
vi.mock("./TransactionSheetProvider", () => ({ useTransactionSheet: () => ({ open }) }));

const tx = (id: string, type: "income" | "expense", amountCents: number, occurredOn: string, name = "Mercado"): TransactionDto => ({
  id, type, amountCents, occurredOn, description: null,
  category: { id: "c1", name, icon: "Wallet", color: "#3ECF8E" },
});

const page = (items: TransactionDto[], nextCursor: string | null = null): TransactionPage => ({ items, nextCursor });

function renderList(props: { type?: "income" | "expense"; categoryId?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TransactionList month="2026-10" {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  open.mockReset();
  sessionMock.request.mockReset();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});

describe("TransactionList", () => {
  it("agrupa lançamentos do mesmo dia sob um cabeçalho com o total do dia", async () => {
    sessionMock.request.mockResolvedValue(
      page([tx("a", "income", 1000, "2026-10-18", "Salário"), tx("b", "expense", 4590, "2026-10-18"), tx("c", "expense", 100, "2026-10-17")]),
    );
    renderList();
    const header = await screen.findByRole("heading", { name: /domingo, 18 de outubro/ });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
    const group = header.closest("section") as HTMLElement;
    expect(within(group).getAllByRole("listitem")).toHaveLength(2);
    expect(within(header).getByText(/−\s*R\$\s*35,90/)).toHaveClass("text-danger");
  });

  it("mostra saída com − e text-danger, entrada com + e text-success", async () => {
    sessionMock.request.mockResolvedValue(page([tx("a", "income", 1000, "2026-10-18", "Salário"), tx("b", "expense", 4590, "2026-10-17")]));
    renderList();
    const out = await screen.findByText(/−\s*R\$\s*45,90/, { selector: "[data-amount]" });
    expect(out).toHaveClass("text-danger");
    expect(within(out).getByText("Saída")).toHaveClass("sr-only");
    const inc = screen.getByText(/\+\s*R\$\s*10,00/, { selector: "[data-amount]" });
    expect(inc).toHaveClass("text-success");
  });

  it("estado vazio com texto exato e CTA", async () => {
    sessionMock.request.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("Nenhum lançamento em outubro de 2026.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Registrar lançamento" }));
    expect(open).toHaveBeenCalledWith();
  });

  it("erro com Tentar de novo", async () => {
    sessionMock.request.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(page([tx("a", "expense", 100, "2026-10-01")]));
    renderList();
    await userEvent.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText(/R\$\s*1,00/, { selector: "[data-amount]" })).toBeInTheDocument();
  });

  it("tocar num item abre o sheet em edição", async () => {
    const t = tx("a", "expense", 100, "2026-10-01");
    sessionMock.request.mockResolvedValue(page([t]));
    renderList();
    await userEvent.click(await screen.findByRole("button", { name: /Mercado/ }));
    expect(open).toHaveBeenCalledWith(t);
  });

  it("envia filtros na query e carrega mais com cursor", async () => {
    sessionMock.request
      .mockResolvedValueOnce(page([tx("a", "expense", 100, "2026-10-02")], "CUR"))
      .mockResolvedValueOnce(page([tx("b", "expense", 200, "2026-10-01")]));
    renderList({ type: "expense", categoryId: "cat-1" });
    await userEvent.click(await screen.findByRole("button", { name: "Carregar mais" }));
    expect(await screen.findByText(/R\$\s*2,00/, { selector: "[data-amount]" })).toBeInTheDocument();
    expect(sessionMock.request.mock.calls[0]![0]).toBe("/transactions?month=2026-10&type=expense&categoryId=cat-1&limit=30");
    expect(sessionMock.request.mock.calls[1]![0]).toContain("cursor=CUR");
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });
});
