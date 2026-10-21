export const MAX_AMOUNT_CENTS = 100_000_000_000;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBrl(cents: number): string {
  return brl.format(cents / 100);
}

/** Converte texto em reais (pt-BR) para centavos inteiros; `null` se inválido, zero ou acima do teto. */
export function parseBrlToCents(input: string): number | null {
  const s = input.replace(/R\$/g, "").replace(/\s+/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s) && !/^\d+(,\d{1,2})?$/.test(s)) return null;
  const [intPart = "", decPart = ""] = s.replace(/\./g, "").split(",");
  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}
