import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Valor em reais como texto; a conversão para centavos acontece no submit. */
export function AmountInput({ value, onChange, error }: AmountInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="amount">Valor</Label>
      <div className="flex items-baseline gap-2 border-b border-border pb-2 focus-within:border-primary">
        <span className="font-mono text-xl text-text-secondary">R$</span>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          placeholder="0,00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "amount-error" : undefined}
          className={cn(
            "min-h-11 w-full min-w-0 bg-transparent font-mono text-3xl text-text-primary outline-none placeholder:text-text-muted",
          )}
        />
      </div>
      {error ? (
        <p id="amount-error" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
