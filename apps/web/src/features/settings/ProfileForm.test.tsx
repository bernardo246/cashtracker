import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserDto } from "@cash/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nav, resetMocks, sessionMock, sessionValue } from "@/features/auth/test-utils";
import { ProfileForm } from "./ProfileForm";

const user: UserDto = { id: "u1", name: "Ana", email: "ana@a.com", avatarUrl: null, hasPassword: true, hasGoogle: true };
const logout = vi.fn();
const updateUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (p: string) => void nav.replace(p), push: (p: string) => void nav.push(p) }),
}));
vi.mock("@/lib/session", () => ({ useSession: () => ({ ...sessionValue(), user, logout, updateUser }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  resetMocks();
  logout.mockReset().mockResolvedValue(undefined);
  updateUser.mockReset();
});

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ProfileForm /></QueryClientProvider>);
}

describe("ProfileForm", () => {
  it("mostra e-mail e métodos de login", () => {
    renderForm();
    expect(screen.getByText("ana@a.com")).toBeInTheDocument();
    expect(screen.getByText("Google · Senha")).toBeInTheDocument();
  });

  it("salva o nome com PATCH /me", async () => {
    sessionMock.request.mockResolvedValue({ ...user, name: "Ana Maria" });
    renderForm();
    const input = screen.getByLabelText("Nome");
    await userEvent.clear(input);
    await userEvent.type(input, "Ana Maria");
    await userEvent.click(screen.getByRole("button", { name: "Salvar nome" }));
    await waitFor(() =>
      expect(sessionMock.request).toHaveBeenCalledWith("/me", { method: "PATCH", json: { name: "Ana Maria" } }),
    );
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ ...user, name: "Ana Maria" }));
  });

  it("valida nome vazio sem chamar a API", async () => {
    renderForm();
    await userEvent.clear(screen.getByLabelText("Nome"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(await screen.findByText("Informe seu nome (até 80 caracteres)")).toBeInTheDocument();
    expect(sessionMock.request).not.toHaveBeenCalled();
  });

  it("Sair encerra a sessão e vai para /login", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login"));
    expect(logout).toHaveBeenCalled();
  });
});
