import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CategoryDto } from "@cash/shared";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionMock, sessionValue } from "@/features/auth/test-utils";
import { ApiError } from "@/lib/api-client";
import { CategoryManager } from "./CategoryManager";

vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cat = (id: string, name: string, type: "income" | "expense", archived = false): CategoryDto => ({
  id, name, type, icon: "Wallet", color: "#3ECF8E", archived,
});
const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const EXPENSES = [cat(ID(1), "Mercado", "expense"), cat(ID(2), "Antiga", "expense", true)];
const INCOMES = [cat(ID(3), "Salário", "income")];

beforeEach(() => {
  sessionMock.request.mockReset();
  sessionMock.request.mockImplementation((path: string) => {
    if (path.startsWith("/categories?")) return Promise.resolve(path.includes("type=income") ? INCOMES : EXPENSES);
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

describe("CategoryManager", () => {
  it("lista saídas (inclusive arquivadas) e troca para entradas", async () => {
    wrap(<CategoryManager />);
    expect(await screen.findByText("Mercado")).toBeInTheDocument();
    expect(screen.getByText("Antiga")).toBeInTheDocument();
    expect(screen.getByText("Arquivada")).toBeInTheDocument();
    expect(sessionMock.request).toHaveBeenCalledWith("/categories?type=expense&includeArchived=true");
    await userEvent.click(screen.getByRole("tab", { name: "Entradas" }));
    expect(await screen.findByText("Salário")).toBeInTheDocument();
  });

  it("cria categoria com nome, ícone e cor", async () => {
    const { spy } = wrap(<CategoryManager />);
    await screen.findByText("Mercado");
    await userEvent.click(screen.getByRole("button", { name: "Nova categoria" }));
    await userEvent.type(await screen.findByLabelText("Nome"), "Pets");
    await userEvent.click(screen.getByRole("button", { name: "Dog" }));
    await userEvent.click(screen.getByRole("button", { name: "#60A5FA" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(call("POST")).toBeDefined());
    expect(call("POST")).toEqual([
      "/categories",
      { method: "POST", json: { name: "Pets", type: "expense", icon: "Dog", color: "#60A5FA" } },
    ]);
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["categories"] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["reports"] });
  });

  it("mostra o erro 409 CATEGORY_EXISTS no formulário", async () => {
    sessionMock.request.mockImplementation((path: string, opts?: { method?: string }) => {
      if (opts?.method === "POST") return Promise.reject(new ApiError(409, "CATEGORY_EXISTS", "Já existe uma categoria com esse nome."));
      return Promise.resolve(EXPENSES);
    });
    wrap(<CategoryManager />);
    await screen.findByText("Mercado");
    await userEvent.click(screen.getByRole("button", { name: "Nova categoria" }));
    await userEvent.type(await screen.findByLabelText("Nome"), "Mercado");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe uma categoria com esse nome.");
  });

  it("arquiva e desarquiva pela linha", async () => {
    wrap(<CategoryManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Arquivar Mercado" }));
    await waitFor(() => expect(call("PATCH")).toBeDefined());
    expect(call("PATCH")).toEqual([`/categories/${ID(1)}`, { method: "PATCH", json: { archived: true } }]);
    await userEvent.click(screen.getByRole("button", { name: "Desarquivar Antiga" }));
    await waitFor(() =>
      expect(sessionMock.request).toHaveBeenCalledWith(`/categories/${ID(2)}`, { method: "PATCH", json: { archived: false } }),
    );
  });

  it("exclui após confirmar", async () => {
    wrap(<CategoryManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Excluir Mercado" }));
    expect(call("DELETE")).toBeUndefined();
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(call("DELETE")).toBeDefined());
    expect(call("DELETE")?.[0]).toBe(`/categories/${ID(1)}`);
  });

  it("409 CATEGORY_IN_USE mostra a mensagem e o botão Arquivar", async () => {
    sessionMock.request.mockImplementation((path: string, opts?: { method?: string }) => {
      if (opts?.method === "DELETE")
        return Promise.reject(new ApiError(409, "CATEGORY_IN_USE", "Esta categoria tem lançamentos. Arquive-a em vez de excluir."));
      return Promise.resolve(EXPENSES);
    });
    wrap(<CategoryManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Excluir Mercado" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esta categoria tem lançamentos. Arquive-a em vez de excluir.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Arquivar" }));
    await waitFor(() =>
      expect(sessionMock.request).toHaveBeenCalledWith(`/categories/${ID(1)}`, { method: "PATCH", json: { archived: true } }),
    );
  });
});
