import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { LoginForm } from "./LoginForm";
import { nav, resetMocks, sessionMock, sessionValue } from "./test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (p: string) => void nav.replace(p), push: (p: string) => void nav.push(p) }),
  useSearchParams: () => nav.params,
}));
vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));

beforeEach(resetMocks);

describe("LoginForm", () => {
  it("mostra a mensagem da API para credenciais inválidas", async () => {
    sessionMock.login.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos"));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@a.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos");
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("redireciona para /visao-geral após login", async () => {
    sessionMock.login.mockResolvedValue(undefined);
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@a.com");
    await userEvent.type(screen.getByLabelText("Senha"), "12345678");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/visao-geral"));
    expect(sessionMock.login).toHaveBeenCalledWith("ana@a.com", "12345678");
  });

  it("mostra a mensagem do Google quando ?erro=google", () => {
    nav.params = new URLSearchParams("erro=google");
    render(<LoginForm />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível entrar com o Google. Tente novamente.");
  });

  it("mostra o aviso de senha redefinida", () => {
    nav.params = new URLSearchParams("redefinida=1");
    render(<LoginForm />);
    expect(screen.getByRole("status")).toHaveTextContent("Senha redefinida. Entre com a nova senha.");
  });

  it("valida o e-mail no cliente sem chamar a API", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-mail"), "invalido");
    await userEvent.type(screen.getByLabelText("Senha"), "12345678");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Informe um e-mail válido")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(sessionMock.login).not.toHaveBeenCalled();
  });

  it("aponta 'Esqueceu a sua senha?' para /esqueci-senha e o Google para a API", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "Esqueceu a sua senha?" })).toHaveAttribute("href", "/esqueci-senha");
    expect(screen.getByRole("link", { name: "Entrar com Google" })).toHaveAttribute("href", "/api/auth/google");
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");
  });

  it("usa autocomplete e inputmode corretos", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("inputmode", "email");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password");
  });
});
