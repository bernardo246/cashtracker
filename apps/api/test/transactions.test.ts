import type { CategoryDto, TransactionDto, TransactionPage } from "@cash/shared";
import type { FastifyInstance } from "fastify";
import type postgres from "postgres";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, closeTestApps, resetDb } from "./helpers/app.js";
import { registerUser } from "./helpers/users.js";

afterEach(closeTestApps);

type Err = { error: { code: string; message: string } };

let app: FastifyInstance;
let sql: postgres.Sql;
beforeEach(async () => {
  const ctx = await buildTestApp();
  app = ctx.app;
  sql = ctx.deps.sql;
  await resetDb(ctx.deps.sql);
});

const call = (token: string, method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: object) =>
  app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(payload && { payload }) });

async function cat(token: string, name: string, type: "income" | "expense"): Promise<CategoryDto> {
  const list = (await call(token, "GET", "/categories?includeArchived=true")).json<CategoryDto[]>();
  return list.find((c) => c.name === name && c.type === type)!;
}

async function make(token: string, categoryId: string, occurredOn: string, extra: object = {}): Promise<TransactionDto> {
  const res = await call(token, "POST", "/transactions", {
    type: "expense",
    categoryId,
    amountCents: 1500,
    occurredOn,
    ...extra,
  });
  expect(res.statusCode).toBe(201);
  return res.json<TransactionDto>();
}

const list = async (token: string, qs = "") => (await call(token, "GET", `/transactions${qs}`)).json<TransactionPage>();

describe("lançamentos: criar", () => {
  it("exige autenticação", async () => {
    expect((await app.inject({ method: "GET", url: "/transactions" })).statusCode).toBe(401);
  });

  it("cria saída em Delivery → 201 com category {id,name,icon,color}", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    const res = await call(accessToken, "POST", "/transactions", {
      type: "expense",
      categoryId: delivery.id,
      amountCents: 2590,
      occurredOn: "2026-10-05",
      description: "  Pizza  ",
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<TransactionDto>()).toMatchObject({
      type: "expense",
      amountCents: 2590,
      occurredOn: "2026-10-05",
      description: "Pizza",
      category: { id: delivery.id, name: "Delivery", icon: "Bike", color: "#FB923C" },
    });
  });

  it("descrição vazia ou em branco vira null", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    expect((await make(accessToken, delivery.id, "2026-10-05", { description: "   " })).description).toBeNull();
    expect((await make(accessToken, delivery.id, "2026-10-05", { description: "" })).description).toBeNull();
  });

  it("saída com categoria de entrada → 400 TYPE_MISMATCH", async () => {
    const { accessToken } = await registerUser(app);
    const salario = await cat(accessToken, "Salário", "income");
    const res = await call(accessToken, "POST", "/transactions", {
      type: "expense",
      categoryId: salario.id,
      amountCents: 100,
      occurredOn: "2026-10-05",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<Err>().error).toMatchObject({
      code: "TYPE_MISMATCH",
      message: "O tipo do lançamento não corresponde ao da categoria.",
    });
  });

  it("categoria arquivada → 400 CATEGORY_ARCHIVED", async () => {
    const { accessToken } = await registerUser(app);
    const lazer = await cat(accessToken, "Lazer", "expense");
    await call(accessToken, "PATCH", `/categories/${lazer.id}`, { archived: true });
    const res = await call(accessToken, "POST", "/transactions", {
      type: "expense",
      categoryId: lazer.id,
      amountCents: 100,
      occurredOn: "2026-10-05",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<Err>().error).toMatchObject({ code: "CATEGORY_ARCHIVED", message: "Esta categoria está arquivada." });
  });

  it("valor 0 e acima do teto → 400", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    for (const amountCents of [0, 100000000001]) {
      const res = await call(accessToken, "POST", "/transactions", {
        type: "expense",
        categoryId: delivery.id,
        amountCents,
        occurredOn: "2026-10-05",
      });
      expect(res.statusCode).toBe(400);
      expect(res.json<Err>().error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("categoria de outro usuário → 404", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const deliveryA = await cat(a.accessToken, "Delivery", "expense");
    const res = await call(b.accessToken, "POST", "/transactions", {
      type: "expense",
      categoryId: deliveryA.id,
      amountCents: 100,
      occurredOn: "2026-10-05",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("lançamentos: atualizar", () => {
  it("PATCH {type:income} sem trocar a categoria → 400 TYPE_MISMATCH", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    const t = await make(accessToken, delivery.id, "2026-10-05");
    const res = await call(accessToken, "PATCH", `/transactions/${t.id}`, { type: "income" });
    expect(res.statusCode).toBe(400);
    expect(res.json<Err>().error.code).toBe("TYPE_MISMATCH");
  });

  it("troca tipo e categoria juntos; categoria arquivada ou de outro tipo é rejeitada", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    const salario = await cat(accessToken, "Salário", "income");
    const lazer = await cat(accessToken, "Lazer", "expense");
    const t = await make(accessToken, delivery.id, "2026-10-05");

    const ok = await call(accessToken, "PATCH", `/transactions/${t.id}`, { type: "income", categoryId: salario.id });
    expect(ok.statusCode).toBe(200);
    expect(ok.json<TransactionDto>()).toMatchObject({ type: "income", category: { id: salario.id } });

    const mismatch = await call(accessToken, "PATCH", `/transactions/${t.id}`, { categoryId: delivery.id });
    expect(mismatch.json<Err>().error.code).toBe("TYPE_MISMATCH");

    await call(accessToken, "PATCH", `/categories/${lazer.id}`, { archived: true });
    const archived = await call(accessToken, "PATCH", `/transactions/${t.id}`, { type: "expense", categoryId: lazer.id });
    expect(archived.statusCode).toBe(400);
    expect(archived.json<Err>().error.code).toBe("CATEGORY_ARCHIVED");
  });

  it("PATCH {amountCents} com categoria arquivada depois → 200, categoria mantida", async () => {
    const { accessToken } = await registerUser(app);
    const lazer = await cat(accessToken, "Lazer", "expense");
    const t = await make(accessToken, lazer.id, "2026-10-05");
    await call(accessToken, "PATCH", `/categories/${lazer.id}`, { archived: true });
    const res = await call(accessToken, "PATCH", `/transactions/${t.id}`, { amountCents: 9999 });
    expect(res.statusCode).toBe(200);
    expect(res.json<TransactionDto>()).toMatchObject({ amountCents: 9999, category: { id: lazer.id } });
  });

  it("description null limpa; texto em branco também", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    const t = await make(accessToken, delivery.id, "2026-10-05", { description: "x" });
    const res = await call(accessToken, "PATCH", `/transactions/${t.id}`, { description: null });
    expect(res.json<TransactionDto>().description).toBeNull();
    const again = await call(accessToken, "PATCH", `/transactions/${t.id}`, { description: "y" });
    expect(again.json<TransactionDto>().description).toBe("y");
    const blank = await call(accessToken, "PATCH", `/transactions/${t.id}`, { description: "  " });
    expect(blank.json<TransactionDto>().description).toBeNull();
  });

  it("PATCH atualiza updated_at no banco", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    const t = await make(accessToken, delivery.id, "2026-10-05");
    await sql`UPDATE app.transactions SET updated_at = '2020-01-01T00:00:00Z' WHERE id = ${t.id}`;
    await call(accessToken, "PATCH", `/transactions/${t.id}`, { amountCents: 42 });
    const [row] = await sql<{ fresh: boolean }[]>`SELECT updated_at > '2020-01-01T00:00:00Z' AS fresh FROM app.transactions WHERE id = ${t.id}`;
    expect(row!.fresh).toBe(true);
  });

  it("corpo vazio → 400; outro usuário → 404; id inválido → 404", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const delivery = await cat(a.accessToken, "Delivery", "expense");
    const t = await make(a.accessToken, delivery.id, "2026-10-05");
    expect((await call(a.accessToken, "PATCH", `/transactions/${t.id}`, {})).statusCode).toBe(400);
    expect((await call(b.accessToken, "PATCH", `/transactions/${t.id}`, { amountCents: 5 })).statusCode).toBe(404);
    expect((await call(a.accessToken, "PATCH", "/transactions/nao-uuid", { amountCents: 5 })).statusCode).toBe(404);
  });
});

describe("lançamentos: excluir", () => {
  it("204 e some da listagem; outro usuário → 404", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const delivery = await cat(a.accessToken, "Delivery", "expense");
    const t = await make(a.accessToken, delivery.id, "2026-10-05");
    expect((await call(b.accessToken, "DELETE", `/transactions/${t.id}`)).statusCode).toBe(404);
    expect((await list(a.accessToken)).items).toHaveLength(1);
    expect((await call(a.accessToken, "DELETE", `/transactions/${t.id}`)).statusCode).toBe(204);
    expect((await list(a.accessToken)).items).toHaveLength(0);
    expect((await call(a.accessToken, "DELETE", `/transactions/${t.id}`)).statusCode).toBe(404);
  });
});

describe("lançamentos: listagem", () => {
  it("month filtra só o mês, em ordem occurredOn DESC, id DESC", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    await make(accessToken, delivery.id, "2026-09-30");
    await make(accessToken, delivery.id, "2026-11-01");
    const a = await make(accessToken, delivery.id, "2026-10-01");
    const b = await make(accessToken, delivery.id, "2026-10-31");
    const c = await make(accessToken, delivery.id, "2026-10-31");
    const page = await list(accessToken, "?month=2026-10");
    const sameDay = [b.id, c.id].sort().reverse();
    expect(page.items.map((i) => i.id)).toEqual([...sameDay, a.id]);
    expect(page.nextCursor).toBeNull();
    expect(page.items[0]!.category).toEqual({ id: delivery.id, name: "Delivery", icon: "Bike", color: "#FB923C" });
  });

  it("filtra por type e categoryId; isola usuários", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const delivery = await cat(a.accessToken, "Delivery", "expense");
    const mercado = await cat(a.accessToken, "Mercado", "expense");
    const salario = await cat(a.accessToken, "Salário", "income");
    await make(a.accessToken, delivery.id, "2026-10-05");
    await make(a.accessToken, mercado.id, "2026-10-06");
    await make(a.accessToken, salario.id, "2026-10-07", { type: "income" });
    expect((await list(a.accessToken, "?type=income")).items).toHaveLength(1);
    expect((await list(a.accessToken, `?categoryId=${mercado.id}`)).items).toHaveLength(1);
    expect((await list(b.accessToken)).items).toHaveLength(0);
  });

  it("paginação por cursor: limit=2 com 3 itens", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    const ids = [
      (await make(accessToken, delivery.id, "2026-10-01")).id,
      (await make(accessToken, delivery.id, "2026-10-02")).id,
      (await make(accessToken, delivery.id, "2026-10-03")).id,
    ];
    const p1 = await list(accessToken, "?limit=2");
    expect(p1.items.map((i) => i.id)).toEqual([ids[2], ids[1]]);
    expect(p1.nextCursor).not.toBeNull();
    const p2 = await list(accessToken, `?limit=2&cursor=${p1.nextCursor}`);
    expect(p2.items.map((i) => i.id)).toEqual([ids[0]]);
    expect(p2.nextCursor).toBeNull();
  });

  it("percorre todas as páginas com datas iguais: sem duplicatas nem lacunas", async () => {
    const { accessToken } = await registerUser(app);
    const delivery = await cat(accessToken, "Delivery", "expense");
    for (const d of ["2026-10-10", "2026-10-10", "2026-10-10", "2026-10-10", "2026-10-09", "2026-10-11", "2026-09-30", "2026-11-01"]) {
      await make(accessToken, delivery.id, d);
    }
    for (const qs of ["", "month=2026-10&"]) {
      const full = (await list(accessToken, qs ? "?month=2026-10" : "")).items.map((i) => i.id);
      expect(full).toHaveLength(qs ? 6 : 8);
      for (const limit of [1, 2, 3]) {
        const walked: string[] = [];
        let cursor: string | null = null;
        let last: TransactionPage | undefined;
        do {
          last = await list(accessToken, `?${qs}limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`);
          walked.push(...last.items.map((i) => i.id));
          cursor = last.nextCursor;
        } while (cursor);
        expect(walked).toEqual(full);
        expect(last.nextCursor).toBeNull();
      }
    }
  });

  it("cursor malformado → 400 INVALID_CURSOR", async () => {
    const { accessToken } = await registerUser(app);
    const bad = [
      "lixo!!",
      Buffer.from("não json").toString("base64url"),
      Buffer.from(JSON.stringify(["2026-10-01"])).toString("base64url"),
      Buffer.from(JSON.stringify(["x", "y"])).toString("base64url"),
      Buffer.from(JSON.stringify(["2026-13-45", "00000000-0000-4000-8000-000000000000"])).toString("base64url"),
    ];
    for (const cursor of bad) {
      const res = await call(accessToken, "GET", `/transactions?cursor=${cursor}`);
      expect(res.statusCode).toBe(400);
      expect(res.json<Err>().error).toMatchObject({ code: "INVALID_CURSOR", message: "Cursor inválido." });
    }
  });

  it("limit e month inválidos → 400", async () => {
    const { accessToken } = await registerUser(app);
    expect((await call(accessToken, "GET", "/transactions?limit=101")).statusCode).toBe(400);
    expect((await call(accessToken, "GET", "/transactions?month=2026-13")).statusCode).toBe(400);
  });
});
