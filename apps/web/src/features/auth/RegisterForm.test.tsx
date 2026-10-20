import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { RegisterForm } from "./RegisterForm";
import { nav, resetMocks, sessionMock, sessionValue } from "./test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (p: string) => void nav.replace(p), push: (p: string) => void nav.push(p) }),
  useSearchParams: () => nav.params,
}));
vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));

beforeEach(resetMocks);

async function fill(password = "12345678") {
  await userEvent.type(screen.getByLabelText("Nome"), "Ana");
  await userEvent.type(screen.getByLabelText("E-mail"), "ana@a.com");
  await userEvent.type(screen.getByLabelText("Senha"), password);
}

describe("RegisterForm", () => {
  it("mostra o erro de campo vindo de fields na senha", async () => {
    sessionMock.register.mockRejectedValue(
      new ApiError(400, "VALIDATION_ERROR", "Dados inválidos", { password: "Senha muito fraca" }),
    );
    render(<RegisterForm />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    const msg = await screen.findByText("Senha muito fraca");
    const input = screen.getByLabelText("Senha");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(msg.id);
  });

  it("mostra EMAIL_TAKEN em região de alerta", async () => {
    sessionMock.register.mockRejectedValue(
      new ApiError(409, "EMAIL_TAKEN", "Este e-mail já tem uma conta. Entre ou use 'Esqueceu a senha'"),
    );
    render(<RegisterForm />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Este e-mail já tem uma conta");
  });

  it("valida senha curta no cliente", async () => {
    render(<RegisterForm />);
    await fill("123");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("A senha deve ter entre 8 e 128 caracteres")).toBeInTheDocument();
    expect(sessionMock.register).not.toHaveBeenCalled();
  });

  it("redireciona após cadastro e usa new-password", async () => {
    sessionMock.register.mockResolvedValue(undefined);
    render(<RegisterForm />);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "new-password");
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/visao-geral"));
    expect(sessionMock.register).toHaveBeenCalledWith({ name: "Ana", email: "ana@a.com", password: "12345678" });
  });
});
