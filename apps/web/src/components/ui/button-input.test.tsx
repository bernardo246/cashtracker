import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { Input } from "./input";

describe("Button", () => {
  it("usa a variante primary por padrão", () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveClass("bg-primary");
  });

  it("aplica a variante danger e o tamanho pill (48px)", () => {
    render(
      <Button variant="danger" size="pill">
        Excluir
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Excluir" });
    expect(btn).toHaveClass("bg-danger", "h-12", "rounded-(--radius-pill)");
  });
});

describe("Input", () => {
  it("tem altura de 44px e anel de foco primary", () => {
    render(<Input aria-label="Valor" />);
    expect(screen.getByLabelText("Valor")).toHaveClass("h-11", "focus-visible:ring-2", "focus-visible:ring-primary");
  });
});
