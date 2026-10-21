import type { ByCategoryReport, CategoryDto, MonthlyReport } from "@cash/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApps, resetDb } from "./helpers/app.js";
import { registerUser } from "./helpers/users.js";

afterEach(closeTestApps);

let app: FastifyInstance;
async function setup(now?: Date) {
  const ctx = await buildTestApp(now ? { now: () => now } : {});
  app = ctx.app;
  await resetDb(ctx.deps.sql);
}

const call = (token: string, method: "GET" | "POST" | "PATCH", url: string, payload?: object) =>
  app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(payload && { payload }) });

async function cat(token: string, name: string, type: "income" | "expense"): Promise<CategoryDto> {
  const list = (await call(token, "GET", "/categories?includeArchived=true")).json<CategoryDto[]>();
  return list.find((c) => c.name === name && c.type === type)!;
}

async function tx(token: string, categoryId: string, type: "income" | "expense", amountCents: number, occurredOn: string) {
  const res = await call(token, "POST", "/transactions", { type, categoryId, amountCents, occurredOn });
  expect(res.statusCode).toBe(201);
}

const byCat = async (token: string, qs: string) => (await call(token, "GET", `/reports/by-category?${qs}`)).json<ByCategoryReport>();
const monthly = async (token: string, qs = "") => (await call(token, "GET", `/reports/monthly${qs}`)).json<MonthlyReport>();

describe("relatórios: by-category", () => {
  it("exige autenticação e valida a query", async () => {
    await setup();
    expect((await app.inject({ method: "GET", url: "/reports/by-category?type=expense&month=2026-10" })).statusCode).toBe(401);
    const { accessToken } = await registerUser(app);
    expect((await call(accessToken, "GET", "/reports/by-category?type=expense")).statusCode).toBe(400);
    expect((await call(accessToken, "GET", "/reports/monthly?months=25")).statusCode).toBe(400);
  });

  it("saídas de outubro: ordem desc, share soma 1, categorias sem valor omitidas", async () => {
    await setup();
    const { accessToken: t } = await registerUser(app);
    const delivery = await cat(t, "Delivery", "expense");
    const lazer = await cat(t, "Lazer", "expense");
    await tx(t, delivery.id, "expense", 1000, "2026-10-01");
    await tx(t, lazer.id, "expense", 2000, "2026-10-31");
    await tx(t, delivery.id, "expense", 1000, "2026-10-15");
    // fora do período e de outro tipo
    await tx(t, delivery.id, "expense", 9999, "2026-09-30");
    await tx(t, delivery.id, "expense", 9999, "2026-11-01");
    const salario = await cat(t, "Salário", "income");
    await tx(t, salario.id, "income", 500000, "2026-10-05");

    const r = await byCat(t, "type=expense&month=2026-10");
    expect(r.period).toEqual({ month: "2026-10" });
    expect(r.totalCents).toBe(4000);
    expect(r.items).toHaveLength(2);
    expect(r.items.map((i) => [i.name, i.totalCents, i.share])).toEqual([
      ["Delivery", 2000, 0.5],
      ["Lazer", 2000, 0.5],
    ]);
    expect(r.items[0]).toMatchObject({ categoryId: delivery.id, icon: "Bike", color: "#FB923C", archived: false });
    expect(r.items.reduce((s, i) => s + i.share, 0)).toBeCloseTo(1, 4);
  });

  it("arredonda share em 4 casas", async () => {
    await setup();
    const { accessToken: t } = await registerUser(app);
    const a = await cat(t, "Delivery", "expense");
    const b = await cat(t, "Lazer", "expense");
    await tx(t, a.id, "expense", 100, "2026-10-01");
    await tx(t, b.id, "expense", 200, "2026-10-01");
    const r = await byCat(t, "type=expense&month=2026-10");
    expect(r.items.map((i) => i.share)).toEqual([0.6667, 0.3333]);
  });

  it("year=2026 agrega o ano todo (dezembro incluso, janeiro seguinte fora)", async () => {
    await setup();
    const { accessToken: t } = await registerUser(app);
    const a = await cat(t, "Delivery", "expense");
    await tx(t, a.id, "expense", 100, "2026-01-01");
    await tx(t, a.id, "expense", 200, "2026-12-31");
    await tx(t, a.id, "expense", 400, "2027-01-01");
    await tx(t, a.id, "expense", 800, "2025-12-31");
    const r = await byCat(t, "type=expense&year=2026");
    expect(r.period).toEqual({ year: 2026 });
    expect(r.totalCents).toBe(300);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ totalCents: 300, share: 1 });
  });

  it("categoria arquivada com valor no período aparece com archived: true", async () => {
    await setup();
    const { accessToken: t } = await registerUser(app);
    const lazer = await cat(t, "Lazer", "expense");
    await tx(t, lazer.id, "expense", 700, "2026-10-10");
    expect((await call(t, "PATCH", `/categories/${lazer.id}`, { archived: true })).statusCode).toBe(200);
    const r = await byCat(t, "type=expense&month=2026-10");
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ name: "Lazer", archived: true, totalCents: 700, share: 1 });
  });

  it("período vazio → totalCents 0 e itens vazios", async () => {
    await setup();
    const { accessToken: t } = await registerUser(app);
    expect(await byCat(t, "type=expense&month=2026-10")).toEqual({ period: { month: "2026-10" }, totalCents: 0, items: [] });
  });

  it("dados de outro usuário não entram", async () => {
    await setup();
    const a = await registerUser(app);
    const b = await registerUser(app);
    await tx(a.accessToken, (await cat(a.accessToken, "Delivery", "expense")).id, "expense", 1000, "2026-10-01");
    await tx(b.accessToken, (await cat(b.accessToken, "Delivery", "expense")).id, "expense", 5000, "2026-10-01");
    const r = await byCat(a.accessToken, "type=expense&month=2026-10");
    expect(r.totalCents).toBe(1000);
    expect(r.items).toHaveLength(1);
  });
});

describe("relatórios: monthly", () => {
  it("now = 31/10 em SP (01:00Z de 01/11): 12 itens de 2025-11 a 2026-10, meses vazios zerados, saldo negativo", async () => {
    await setup(new Date("2026-11-01T01:00:00Z"));
    const { accessToken: t } = await registerUser(app);
    const delivery = await cat(t, "Delivery", "expense");
    const salario = await cat(t, "Salário", "income");
    await tx(t, salario.id, "income", 100000, "2026-10-05");
    await tx(t, delivery.id, "expense", 30000, "2026-10-06");
    await tx(t, delivery.id, "expense", 5000, "2025-11-01");
    await tx(t, delivery.id, "expense", 7000, "2025-10-31"); // fora da janela
    await tx(t, delivery.id, "expense", 9000, "2026-11-01"); // fora da janela

    const r = await monthly(t, "?months=12");
    expect(r.items).toHaveLength(12);
    expect(r.items[0]).toEqual({ month: "2025-11", incomeCents: 0, expenseCents: 5000, balanceCents: -5000 });
    expect(r.items[11]).toEqual({ month: "2026-10", incomeCents: 100000, expenseCents: 30000, balanceCents: 70000 });
    expect(r.items.map((i) => i.month)).toEqual([
      "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04",
      "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
    ]);
    expect(r.items[5]).toEqual({ month: "2026-04", incomeCents: 0, expenseCents: 0, balanceCents: 0 });
  });

  it("virada Dez→Jan e padrão de 12 meses", async () => {
    await setup(new Date("2026-02-15T12:00:00Z"));
    const { accessToken: t } = await registerUser(app);
    const delivery = await cat(t, "Delivery", "expense");
    await tx(t, delivery.id, "expense", 100, "2025-12-31");
    await tx(t, delivery.id, "expense", 200, "2026-01-01");
    const r = await monthly(t, "?months=3");
    expect(r.items.map((i) => [i.month, i.expenseCents])).toEqual([
      ["2025-12", 100],
      ["2026-01", 200],
      ["2026-02", 0],
    ]);
    expect((await monthly(t)).items).toHaveLength(12);
    expect((await monthly(t, "?months=1")).items.map((i) => i.month)).toEqual(["2026-02"]);
  });

  it("dados de outro usuário não entram", async () => {
    await setup(new Date("2026-10-20T12:00:00Z"));
    const a = await registerUser(app);
    const b = await registerUser(app);
    await tx(a.accessToken, (await cat(a.accessToken, "Delivery", "expense")).id, "expense", 1000, "2026-10-01");
    await tx(b.accessToken, (await cat(b.accessToken, "Delivery", "expense")).id, "expense", 5000, "2026-10-01");
    const r = await monthly(a.accessToken, "?months=1");
    expect(r.items[0]).toEqual({ month: "2026-10", incomeCents: 0, expenseCents: 1000, balanceCents: -1000 });
  });
});
