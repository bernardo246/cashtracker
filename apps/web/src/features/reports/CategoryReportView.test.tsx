import type { ByCategoryReport } from "@cash/shared";
import { currentMonthSaoPaulo } from "@cash/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nav, sessionMock, sessionValue } from "@/features/auth/test-utils";
import { CategoryReportView } from "./CategoryReportView";

vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/gastos",
  useSearchParams: () => nav.params,
}));
const open = vi.fn();
vi.mock("@/features/transactions/TransactionSheetProvider", () => ({ useTransactionSheet: () => ({ open }) }));
vi.mock("./CategoryBarChart", () => ({
  CategoryBarChart: ({ items }: { items: { name: string }[] }) => (
    <ul data-testid="chart">{items.map((i) => <li key={i.name}>{i.name}</li>)}</ul>
  ),
}));

const report = (over: Partial<ByCategoryReport> = {}): ByCategoryReport => ({
  period: { month: "2026-10" },
  totalCents: 100000,
  items: [
    { categoryId: "1", name: "Mercado", icon: "ShoppingCart", color: "#fff", archived: false, totalCents: 62500, share: 0.625 },
    { categoryId: "2", name: "Transporte", icon: "Bus", color: "#fff", archived: false, totalCents: 25000, share: 0.25 },
    { categoryId: "3", name: "Lazer", icon: "Gamepad2", color: "#fff", archived: true, totalCents: 12500, share: 0.125 },
  ],
  ...over,
});

function renderView(type: "expense" | "income" = "expense") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CategoryReportView type={type} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  nav.replace.mockReset();
  nav.params = new URLSearchParams("mes=2026-10");
  open.mockReset();
  sessionMock.request.mockReset();
});

describe("CategoryReportView", () => {
  it("mostra eyebrow, total do período e o gráfico com as categorias na ordem recebida", async () => {
    sessionMock.request.mockResolvedValue(report());
    renderView();
    expect(screen.getByText("GASTOS")).toBeInTheDocument();
    const chart = await screen.findByTestId("chart");
    expect(within(chart).getAllByRole("listitem").map((l) => l.textContent)).toEqual(["Mercado", "Transporte", "Lazer"]);
    expect(screen.getByText(/R\$\s*1\.000,00/)).toBeInTheDocument();
    expect(sessionMock.request).toHaveBeenCalledWith("/reports/by-category?type=expense&month=2026-10");
  });

  it("'Ver como tabela' alterna para uma tabela com valores e percentuais", async () => {
    sessionMock.request.mockResolvedValue(report());
    renderView();
    await screen.findByTestId("chart");
    const toggle = screen.getByRole("button", { name: "Ver como tabela" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    const table = screen.getByRole("table");
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(rows[1]!.textContent).toMatch(/Mercado.*R\$\s*625,00.*62,5%/);
    expect(rows[3]!.textContent).toMatch(/Lazer \(arquivada\).*12,5%/);
  });

  it("'Ano todo' troca a query para year e a URL para ?ano=", async () => {
    sessionMock.request.mockResolvedValue(report());
    renderView();
    await screen.findByTestId("chart");
    await userEvent.click(screen.getByRole("button", { name: "Ano todo" }));
    expect(nav.replace).toHaveBeenCalledWith("/gastos?ano=2026", { scroll: false });
  });

  it("com ?ano= consulta year", async () => {
    nav.params = new URLSearchParams("ano=2026");
    sessionMock.request.mockResolvedValue(report({ period: { year: 2026 } }));
    renderView("income");
    await screen.findByTestId("chart");
    expect(screen.getByText("ENTRADAS")).toBeInTheDocument();
    expect(sessionMock.request).toHaveBeenCalledWith("/reports/by-category?type=income&year=2026");
  });

  it("estado vazio mostra o texto exato e o CTA abre o sheet", async () => {
    sessionMock.request.mockResolvedValue(report({ items: [], totalCents: 0 }));
    renderView();
    expect(await screen.findByText("Nenhum gasto em outubro de 2026.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Registrar lançamento" }));
    expect(open).toHaveBeenCalled();
  });

  it("estado vazio de entradas", async () => {
    sessionMock.request.mockResolvedValue(report({ items: [], totalCents: 0 }));
    renderView("income");
    expect(await screen.findByText("Nenhuma entrada em outubro de 2026.")).toBeInTheDocument();
  });

  it("erro mostra Tentar de novo", async () => {
    sessionMock.request.mockRejectedValueOnce(new Error("x"));
    renderView();
    const retry = await screen.findByRole("button", { name: "Tentar de novo" });
    sessionMock.request.mockResolvedValue(report());
    await userEvent.click(retry);
    expect(await screen.findByTestId("chart")).toBeInTheDocument();
  });

  it("usa o mês corrente quando não há parâmetro", async () => {
    nav.params = new URLSearchParams();
    sessionMock.request.mockResolvedValue(report());
    renderView();
    await screen.findByTestId("chart");
    expect(sessionMock.request).toHaveBeenCalledWith(`/reports/by-category?type=expense&month=${currentMonthSaoPaulo()}`);
  });
});
