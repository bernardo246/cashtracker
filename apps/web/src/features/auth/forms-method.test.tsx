import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotForm } from "./ForgotForm";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { ResetForm } from "./ResetForm";
import { nav, resetMocks, sessionValue } from "./test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));

beforeEach(() => {
  resetMocks();
  nav.params = new URLSearchParams(`token=${"t".repeat(32)}`);
});

// Submit nativo antes da hidratação nunca pode colocar credenciais na URL (GET).
describe("formulários de autenticação", () => {
  it.each([
    ["login", <LoginForm key="l" />],
    ["cadastro", <RegisterForm key="r" />],
    ["esqueci-senha", <ForgotForm key="f" />],
    ["redefinir-senha", <ResetForm key="x" />],
  ])("%s usa method=post", (_name, ui) => {
    const { container } = render(ui);
    expect(container.querySelector("form")).toHaveAttribute("method", "post");
  });
});
