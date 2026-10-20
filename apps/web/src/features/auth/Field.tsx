import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldProps extends Omit<ComponentProps<"input">, "id" | "name"> {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

/** Rótulo + input + erro/ajuda ligados por aria-describedby. */
export function Field({ name, label, error, hint, trailing, className, ...props }: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(trailing && "pr-12", className)}
          {...props}
        />
        {trailing}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-text-primary">
      {children}
    </p>
  );
}
