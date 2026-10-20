const TZ = "America/Sao_Paulo";
const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function todaySaoPaulo(now: Date = new Date()): string {
  return dayFmt.format(now);
}

export function currentMonthSaoPaulo(now: Date = new Date()): string {
  return todaySaoPaulo(now).slice(0, 7);
}

export function isMonthKey(s: string): boolean {
  return MONTH_RE.test(s);
}

export function shiftMonth(month: string, delta: number): string {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Mês inválido: ${month}`);
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta;
  const year = Math.floor(index / 12);
  const mon = (index % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(mon).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Mês inválido: ${month}`);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)),
  );
}

/** `YYYY-MM-DD` que existe no calendário (rejeita 2026-02-30). */
export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
