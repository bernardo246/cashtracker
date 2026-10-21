import type { CategoryDto } from "@cash/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { transactions } from "../src/db/schema.js";
import { buildTestApp, closeTestApps, resetDb, testEnv } from "./helpers/app.js";
import { registerUser } from "./helpers/users.js";

afterEach(closeTestApps);

type Ctx = Awaited<ReturnType<typeof buildTestApp>>;
type Err = { error: { code: string; message: string } };

let ctx: Ctx;
let app: FastifyInstance;
beforeEach(async () => {
  ctx = await buildTestApp();
  app = ctx.app;
  await resetDb(ctx.deps.sql);
});

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const call = (token: string, method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: object) =>
  app.inject({ method, url, headers: auth(token), ...(payload && { payload }) });
const newCat = { name: "Pets", type: "expense", icon: "Dog", color: "#3ECF8E" };

async function findByName(token: string, name: string): Promise<CategoryDto> {
  const list = (await call(token, "GET", "/categories?includeArchived=true")).json<CategoryDto[]>();
  return list.find((c) => c.name === name)!;
}

describe("categorias: listagem", () => {
  it("exige autenticação", async () => {
    expect((await app.inject({ method: "GET", url: "/categories" })).statusCode).toBe(401);
  });

  it("?type=expense lista as 9 padrão em ordem alfabética; arquivadas só com includeArchived=true", async () => {
    const { accessToken } = await registerUser(app);
    const res = await call(accessToken, "GET", "/categories?type=expense");
    expect(res.statusCode).toBe(200);
    const names = res.json<CategoryDto[]>().map((c) => c.name);
    expect(names).toEqual(["Assinaturas", "Combustível", "Delivery", "Lazer", "Mercado", "Moradia", "Outros", "Saúde", "Transporte"]);

    const lazer = await findByName(accessToken, "Lazer");
    await call(accessToken, "PATCH", `/categories/${lazer.id}`, { archived: true });
    const without = (await call(accessToken, "GET", "/categories?type=expense")).json<CategoryDto[]>();
    expect(without).toHaveLength(8);
    expect(without.map((c) => c.name)).not.toContain("Lazer");
    const withArchived = (await call(accessToken, "GET", "/categories?type=expense&includeArchived=true")).json<CategoryDto[]>();
    expect(withArchived).toHaveLength(9);
    expect(withArchived.find((c) => c.name === "Lazer")?.archived).toBe(true);
  });

  it("sem type devolve as 14 padrão (ambos os tipos)", async () => {
    const { accessToken } = await registerUser(app);
    expect((await call(accessToken, "GET", "/categories")).json<CategoryDto[]>()).toHaveLength(14);
  });

  it("filtro inválido → 400", async () => {
    const { accessToken } = await registerUser(app);
    expect((await call(accessToken, "GET", "/categories?type=foo")).statusCode).toBe(400);
  });
});

describe("categorias: criar e renomear", () => {
  it("cria → 201 com o DTO", async () => {
    const { accessToken } = await registerUser(app);
    const res = await call(accessToken, "POST", "/categories", newCat);
    expect(res.statusCode).toBe(201);
    expect(res.json<CategoryDto>()).toMatchObject({ ...newCat, archived: false });
  });

  it('"delivery" (minúsculo) com "Delivery" existente → 409 CATEGORY_EXISTS; no outro tipo é permitido', async () => {
    const { accessToken } = await registerUser(app);
    const dup = await call(accessToken, "POST", "/categories", { ...newCat, name: "delivery" });
    expect(dup.statusCode).toBe(409);
    expect(dup.json<Err>().error).toMatchObject({ code: "CATEGORY_EXISTS", message: "Já existe uma categoria com esse nome." });
    expect((await call(accessToken, "POST", "/categories", { ...newCat, name: "delivery", type: "income" })).statusCode).toBe(201);
  });

  it("renomear para nome existente → 409; outro usuário pode usar o mesmo nome", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const lazer = await findByName(a.accessToken, "Lazer");
    const res = await call(a.accessToken, "PATCH", `/categories/${lazer.id}`, { name: "MERCADO" });
    expect(res.statusCode).toBe(409);
    expect(res.json<Err>().error.code).toBe("CATEGORY_EXISTS");
    expect((await call(b.accessToken, "POST", "/categories", { ...newCat, name: "Delivery" })).statusCode).toBe(409);
    const ok = await call(a.accessToken, "PATCH", `/categories/${lazer.id}`, { name: "  Diversão " });
    expect(ok.json<CategoryDto>().name).toBe("Diversão");
  });

  it("ícone fora de CATEGORY_ICONS → 400", async () => {
    const { accessToken } = await registerUser(app);
    const res = await call(accessToken, "POST", "/categories", { ...newCat, icon: "Rocket" });
    expect(res.statusCode).toBe(400);
    expect(res.json<Err>().error.code).toBe("VALIDATION_ERROR");
  });
});

describe("categorias: arquivar e tipo imutável", () => {
  it("PATCH {archived:true} arquiva e {archived:false} reativa", async () => {
    const { accessToken } = await registerUser(app);
    const c = await findByName(accessToken, "Lazer");
    const on = await call(accessToken, "PATCH", `/categories/${c.id}`, { archived: true });
    expect(on.json<CategoryDto>().archived).toBe(true);
    const off = await call(accessToken, "PATCH", `/categories/${c.id}`, { archived: false });
    expect(off.json<CategoryDto>().archived).toBe(false);
  });

  it("PATCH {type} → 400 (tipo imutável)", async () => {
    const { accessToken } = await registerUser(app);
    const c = await findByName(accessToken, "Lazer");
    expect((await call(accessToken, "PATCH", `/categories/${c.id}`, { type: "income" })).statusCode).toBe(400);
  });
});

describe("categorias: excluir", () => {
  it("sem lançamentos → 204 e some da lista", async () => {
    const { accessToken } = await registerUser(app);
    const created = (await call(accessToken, "POST", "/categories", newCat)).json<CategoryDto>();
    expect((await call(accessToken, "DELETE", `/categories/${created.id}`)).statusCode).toBe(204);
    expect((await call(accessToken, "GET", `/categories/${created.id}`)).statusCode).toBe(404);
  });

  it("com lançamentos → 409 CATEGORY_IN_USE e a categoria continua existindo", async () => {
    const { accessToken, user } = await registerUser(app);
    const c = await findByName(accessToken, "Mercado");
    await ctx.deps.db.insert(transactions).values({
      userId: user.id,
      categoryId: c.id,
      type: "expense",
      amountCents: 1000,
      occurredOn: "2026-10-01",
    });
    const res = await call(accessToken, "DELETE", `/categories/${c.id}`);
    expect(res.statusCode).toBe(409);
    expect(res.json<Err>().error).toMatchObject({
      code: "CATEGORY_IN_USE",
      message: "Esta categoria tem lançamentos. Arquive-a em vez de excluir.",
    });
    expect((await call(accessToken, "GET", `/categories/${c.id}`)).statusCode).toBe(200);
  });

  it("a FK RESTRICT também vira CATEGORY_IN_USE (corrida entre checagem e delete)", async () => {
    const { accessToken, user } = await registerUser(app);
    const c = await findByName(accessToken, "Mercado");
    // simula a corrida: o lançamento aparece depois da checagem de uso, antes do DELETE
    const { createCategoryService } = await import("../src/modules/categories/categories.service.js");
    const racing = Object.create(ctx.deps.db) as typeof ctx.deps.db;
    let first = true;
    racing.select = ((...args: unknown[]) => {
      const q = (ctx.deps.db.select as (...a: unknown[]) => { from: (t: unknown) => unknown })(...args);
      const from = q.from.bind(q);
      q.from = (t: unknown) => {
        if (t === transactions && first) {
          first = false;
          return {
            where: () => ({
              limit: async () => {
                await ctx.deps.db.insert(transactions).values({
                  userId: user.id, categoryId: c.id, type: "expense", amountCents: 1, occurredOn: "2026-10-01",
                });
                return [];
              },
            }),
          };
        }
        return from(t);
      };
      return q;
    }) as typeof racing.select;
    await expect(createCategoryService(racing).remove(user.id, c.id)).rejects.toMatchObject({ code: "CATEGORY_IN_USE" });
  });
});

describe("categorias: isolamento entre usuários", () => {
  it("B fazendo GET/PATCH/DELETE numa categoria de A → 404; id não-uuid → 404", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const c = await findByName(a.accessToken, "Mercado");
    for (const [method, payload] of [["GET"], ["PATCH", { name: "X" }], ["DELETE"]] as const) {
      const res = await call(b.accessToken, method, `/categories/${c.id}`, payload);
      expect(res.statusCode).toBe(404);
      expect(res.json<Err>().error.code).toBe("NOT_FOUND");
    }
    expect((await call(b.accessToken, "GET", "/categories/nao-e-uuid")).statusCode).toBe(404);
    // intacta para A
    expect((await call(a.accessToken, "GET", `/categories/${c.id}`)).statusCode).toBe(200);
    expect((await call(b.accessToken, "GET", "/categories")).json<CategoryDto[]>().map((x) => x.id)).not.toContain(c.id);
  });
});

describe("categorias: rate limit autenticado (300/min por usuário)", () => {
  it("301ª requisição do usuário A → 429; usuário B não é afetado", async () => {
    const limited = await buildTestApp({ env: testEnv({ RATE_LIMIT_ENABLED: "true" }) });
    app = limited.app;
    await resetDb(limited.deps.sql);
    const a = await registerUser(app);
    const b = await registerUser(app);
    for (let i = 0; i < 300; i++) {
      const r = await call(a.accessToken, "GET", "/categories?type=income");
      if (r.statusCode !== 200) throw new Error(`requisição ${i + 1}: ${r.statusCode}`);
    }
    const blocked = await call(a.accessToken, "GET", "/categories?type=income");
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<Err>().error.code).toBe("RATE_LIMITED");
    expect((await call(b.accessToken, "GET", "/categories?type=income")).statusCode).toBe(200);
  });
});
