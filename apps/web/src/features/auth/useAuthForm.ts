"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import type { FieldErrors } from "./validation";

/** Estado comum dos formulários: pendente, erro geral (role=alert) e erros por campo. */
export function useAuthForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function submit(clientErrors: FieldErrors, action: () => Promise<void>) {
    setError(null);
    setErrorCode(null);
    setFields(clientErrors);
    if (Object.keys(clientErrors).length > 0) return false;
    setPending(true);
    try {
      await action();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.code);
        setFields(err.fields ?? {});
      } else {
        setError("Algo deu errado. Tente novamente.");
      }
      return false;
    } finally {
      setPending(false);
    }
  }

  return { pending, error, errorCode, fields, submit };
}
