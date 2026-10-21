import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryCards } from "./SummaryCards";

const item = (over: Partial<{ incomeCents: number; expenseCents: number; balanceCents: number }> = {}) => ({
  month: "2026-10",
  incomeCents: 0,
  expenseCents: 0,
  balanceCents: 0,
  ...over,
});

describe("SummaryCards", () => {
  it("saldo negativo mostra o sinal −, o ícone TrendingDown e o texto acessível", () => {
    const { container } = render(<SummaryCards month={item({ incomeCents: 10000, expenseCents: 15000, balanceCents: -5000 })} />);
    expect(screen.getByText("SALDO DE OUTUBRO")).toBeInTheDocument();
    expect(screen.getByTestId("balance").textContent).toMatch(/^Saldo negativo−R\$\s50,00$/);
    expect(screen.getByText("Saldo negativo")).toHaveClass("sr-only");
    expect(screen.getByTestId("balance")).toHaveClass("text-display", "text-danger");
    expect(container.querySelector("svg.lucide-trending-down")).toBeInTheDocument();
    expect(container.querySelector("svg.lucide-trending-up")).not.toBeInTheDocument();
  });

  it("saldo positivo mostra + e TrendingUp", () => {
    const { container } = render(<SummaryCards month={item({ incomeCents: 20000, balanceCents: 20000 })} />);
    expect(screen.getByTestId("balance").textContent).toMatch(/^Saldo positivo\+R\$\s200,00$/);
    expect(container.querySelector("svg.lucide-trending-up")).toBeInTheDocument();
  });

  it("mês zerado mostra R$ 0,00 (não vazio), sem sinal nem ícone", () => {
    const { container } = render(<SummaryCards month={item()} />);
    expect(screen.getByTestId("balance").textContent).toMatch(/^R\$\s0,00$/);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("income").textContent).toMatch(/R\$\s0,00/);
    expect(screen.getByTestId("expense").textContent).toMatch(/R\$\s0,00/);
  });

  it("cards Ganhos e Gastos do mês", () => {
    render(<SummaryCards month={item({ incomeCents: 123456, expenseCents: 7890, balanceCents: 115566 })} />);
    expect(screen.getByTestId("income").textContent).toMatch(/Ganhos.*R\$\s1\.234,56/);
    expect(screen.getByTestId("expense").textContent).toMatch(/Gastos.*R\$\s78,90/);
  });
});
