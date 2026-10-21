import type { MonthlyReport } from "@cash/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MonthlyChart } from "./MonthlyChart";
import { shortMonth, toChartData } from "./monthly-data";

vi.mock("next/dynamic", () => ({
  default: () =>
    function Stub({ data }: { data: unknown[] }) {
      return <div data-testid="canvas">{data.length}</div>;
    },
}));

const items = (n = 12): MonthlyReport["items"] =>
  Array.from({ length: n }, (_, i) => {
    const m = i + 1; // 2025-11 .. 2026-10
    const month = m <= 2 ? `2025-${m + 10}` : `2026-${String(m - 2).padStart(2, "0")}`;
    return { month, incomeCents: 1000 * m, expenseCents: 400 * m, balanceCents: 600 * m };
  });

describe("toChartData", () => {
  it("mapeia mês abreviado sem ponto e mantém os centavos", () => {
    const [first, , , , , , , , , , , last] = toChartData(items());
    expect(first).toMatchObject({ month: "2025-11", label: "nov", income: 1000, expense: 400, balance: 600 });
    expect(last).toMatchObject({ month: "2026-10", label: "out", income: 12000 });
  });
  it("shortMonth remove o ponto final do Intl", () => {
    expect(shortMonth("2026-09")).toBe("set");
    expect(shortMonth("2026-05")).toBe("mai");
  });
});

describe("MonthlyChart", () => {
  it("expõe o gráfico como imagem com rótulo", () => {
    render(<MonthlyChart items={items()} />);
    expect(screen.getByRole("img", { name: "Ganhos, gastos e diferença nos últimos 12 meses" })).toBeInTheDocument();
  });

  it("legenda em HTML fora do scroller do gráfico", () => {
    render(<MonthlyChart items={items()} />);
    const legend = screen.getByTestId("legend");
    expect(legend.textContent).toBe("GanhosGastosDiferença");
    expect(screen.getByTestId("canvas").contains(legend)).toBe(false);
  });

  it("'Ver como tabela' mostra 12 linhas com Mês/Ganhos/Gastos/Diferença", async () => {
    render(<MonthlyChart items={items()} />);
    const toggle = screen.getByRole("button", { name: "Ver como tabela" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Mês", "Ganhos", "Gastos", "Diferença"]);
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(13);
    expect(rows[1]!.textContent).toMatch(/novembro de 2025.*R\$\s10,00.*R\$\s4,00.*R\$\s6,00/);
    expect(screen.queryByTestId("canvas")).not.toBeInTheDocument();
  });
});
