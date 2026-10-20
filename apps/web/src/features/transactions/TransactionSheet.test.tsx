import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CategoryDto, TransactionDto } from "@cash/shared";
import { todaySaoPaulo } from "@cash/shared";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionMock, sessionValue } from "@/features/auth/test-utils";
import { TransactionSheet } from "./TransactionSheet";

vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: vi.fn() } }));

const cat = (id: string, name: string, type: "income" | "expense", archived = false): CategoryDto => ({
  id, name, type, icon: "Wallet", color: "#3ECF8E", archived,
});
const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const EXPENSES = [cat(ID(1), "Mercado", "expense"), cat(ID(2), "Moradia", "expense")];
const INCOMES = [cat(ID(3), "Salário", "income")];

beforeEach(() => {
  toastSuccess.mockReset();
  sessionMock.request.mockReset();
  sessionMock.request.mockImplementation((path: string, opts?: { method?: string }) => {
    if (path.startsWith("/categories")) return Promise.resolve(path.includes("type=income") ? INCOMES : EXPENSES);
    if (opts?.method === "DELETE") return Promise.resolve(undefined);
    return Promise.resolve({});
  });
  window.matchMedia = ((q: string) => ({
    matches: true, media: q, addEventListener() {}, removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(client, "invalidateQueries");
  return { spy, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

const call = (method: string) =>
  sessionMock.request.mock.calls.find(([, o]) => (o as { method?: string } | undefined)?.method === method);

describe("TransactionSheet", () => {
  it("abre com Saída, data de hoje e só chips de saídas não arquivadas", async () => {
    wrap(<TransactionSheet open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Saída" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Data")).toHaveValue(todaySaoPaulo());
    expect(await screen.findByRole("radio", { name: "Mercado" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Moradia" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Salário" })).not.toBeInTheDocument();
    expect(sessionMock.request).toHaveBeenCalledWith("/categories?type=expense");
  });

  it("trocar para Entrada troca os chips e limpa a categoria", async () => {
    wrap(<TransactionSheet open onOpenChange={() => {}} />);
    await userEvent.click(await screen.findByRole("radio", { name: "Mercado" }));
    expect(screen.getByRole("radio", { name: "Mercado" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Entrada" }));
    expect(await screen.findByRole("radio", { name: "Salário" })).not.toBeChecked();
    expect(screen.queryByRole("radio", { name: "Mercado" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Valor"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Escolha uma categoria")).toBeInTheDocument();
    expect(call("POST")).toBeUndefined();
  });

  it("envia {type, categoryId, amountCents, occurredOn, description}", async () => {
    const onOpenChange = vi.fn();
    const { spy } = wrap(<TransactionSheet open onOpenChange={onOpenChange} />);
    await userEvent.type(screen.getByLabelText("Valor"), "12,3");
    await userEvent.click(await screen.findByRole("radio", { name: "Mercado" }));
    await userEvent.type(screen.getByLabelText("Descrição (opcional)"), "  feira ");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(call("POST")).toBeDefined());
    expect(call("POST")).toEqual([
      "/transactions",
      {
        method: "POST",
        json: { type: "expense", categoryId: ID(1), amountCents: 1230, occurredOn: todaySaoPaulo(), description: "feira" },
      },
    ]);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Lançamento salvo"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(spy).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["reports"] });
  });

  it("bloqueia o submit com valor inválido", async () => {
    wrap(<TransactionSheet open onOpenChange={() => {}} />);
    await userEvent.type(screen.getByLabelText("Valor"), "abc");
    await userEvent.click(await screen.findByRole("radio", { name: "Mercado" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Informe um valor válido")).toBeInTheDocument();
    expect(call("POST")).toBeUndefined();
  });

  it("abaixo de 768px usa o Drawer (bottom sheet)", async () => {
    window.matchMedia = ((q: string) => ({
      matches: false, media: q, addEventListener() {}, removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    wrap(<TransactionSheet open onOpenChange={() => {}} />);
    expect(document.querySelector("[data-slot='drawer-content']")).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: "Mercado" })).toBeInTheDocument();
  });

  it("não mostra Excluir na criação", () => {
    wrap(<TransactionSheet open onOpenChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  const tx: TransactionDto = {
    id: ID(9), type: "expense", amountCents: 5000, occurredOn: "2026-10-01", description: "antigo",
    category: { id: ID(7), name: "Velha", icon: "Wallet", color: "#3ECF8E" },
  };

  it("edição: mostra Excluir, inclui categoria arquivada e salva com PATCH", async () => {
    const onOpenChange = vi.fn();
    wrap(<TransactionSheet open onOpenChange={onOpenChange} transaction={tx} />);
    expect(screen.getByLabelText("Valor")).toHaveValue("50,00");
    expect(await screen.findByRole("radio", { name: "Velha" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(call("PATCH")).toBeDefined());
    expect(call("PATCH")).toEqual([
      `/transactions/${ID(9)}`,
      {
        method: "PATCH",
        json: { type: "expense", categoryId: ID(7), amountCents: 5000, occurredOn: "2026-10-01", description: "antigo" },
      },
    ]);
  });

  it("edição: excluir pede confirmação", async () => {
    const onOpenChange = vi.fn();
    wrap(<TransactionSheet open onOpenChange={onOpenChange} transaction={tx} />);
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(call("DELETE")).toBeUndefined();
    const confirm = screen.getByText("Excluir este lançamento?").parentElement as HTMLElement;
    await userEvent.click(within(confirm).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(call("DELETE")).toEqual([`/transactions/${ID(9)}`, { method: "DELETE" }]));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Lançamento excluído"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
