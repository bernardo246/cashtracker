import { vi } from "vitest";

// Estado mutável compartilhado pelos mocks de next/navigation e useSession.
export const nav = {
  replace: vi.fn(),
  push: vi.fn(),
  params: new URLSearchParams(),
};

export const sessionMock = {
  status: "anonymous" as "loading" | "authenticated" | "anonymous",
  login: vi.fn(),
  register: vi.fn(),
  request: vi.fn(),
};

export function resetMocks() {
  nav.replace.mockReset();
  nav.push.mockReset();
  nav.params = new URLSearchParams();
  sessionMock.status = "anonymous";
  sessionMock.login.mockReset();
  sessionMock.register.mockReset();
  sessionMock.request.mockReset();
}

export function sessionValue() {
  return {
    status: sessionMock.status,
    user: null,
    login: sessionMock.login,
    register: sessionMock.register,
    logout: vi.fn(),
    api: { request: sessionMock.request, setAccessToken: vi.fn(), refresh: vi.fn() },
  };
}
