import { currentMonthSaoPaulo, shiftMonth } from "@cash/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MonthPicker } from "./MonthPicker";

describe("MonthPicker", () => {
  it("desabilita Próximo mês no mês corrente", () => {
    render(<MonthPicker value={currentMonthSaoPaulo()} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Próximo mês" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeEnabled();
  });

  it("navega entre meses e mostra o rótulo", async () => {
    const onChange = vi.fn();
    render(<MonthPicker value="2026-01" onChange={onChange} />);
    expect(screen.getByText("Janeiro de 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(onChange).toHaveBeenCalledWith("2025-12");
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(onChange).toHaveBeenCalledWith("2026-02");
  });

  it("permite avançar quando o mês é anterior ao corrente", () => {
    render(<MonthPicker value={shiftMonth(currentMonthSaoPaulo(), -1)} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Próximo mês" })).toBeEnabled();
  });

  it("com allowYear mostra o botão Ano todo", async () => {
    const onYearToggle = vi.fn();
    render(<MonthPicker value="2026-01" onChange={() => {}} allowYear yearSelected={false} onYearToggle={onYearToggle} />);
    const btn = screen.getByRole("button", { name: "Ano todo" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(btn);
    expect(onYearToggle).toHaveBeenCalled();
  });
});
