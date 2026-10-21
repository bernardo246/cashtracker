import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "./AmountInput";

describe("AmountInput", () => {
  it("usa teclado decimal, prefixo R$ e fonte mono grande", () => {
    render(<AmountInput value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Valor");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveAttribute("enterkeyhint", "done");
    expect(input.className).toContain("font-mono");
    expect(input.className).toContain("text-3xl");
    expect(screen.getByText("R$")).toBeInTheDocument();
  });

  it("exibe o erro associado ao campo", () => {
    render(<AmountInput value="abc" onChange={() => {}} error="Informe um valor válido" />);
    expect(screen.getByLabelText("Valor")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Informe um valor válido")).toBeInTheDocument();
  });
});
