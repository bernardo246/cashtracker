# Cash Tracker — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o Cash Tracker (PWA mobile-first de entradas/saídas por categoria, com dashboards e login Google/e-mail) e publicá-lo em Vercel + Render + Supabase com custo zero.

**Architecture:** Monorepo pnpm com `packages/shared` (Zod + utilitários), `apps/api` (Fastify, Drizzle, Postgres) e `apps/web` (Next.js App Router). O navegador só fala com o domínio da Vercel; um rewrite `/api/*` encaminha para a API no Render, tornando os cookies de primeira parte. A API emite JWT RS256 (15 min, em memória) + refresh token rotativo (cookie `httpOnly`).

**Tech Stack:** Node 24 LTS, pnpm 10, TypeScript 6.0, Next.js 16, React 19, Tailwind 4, shadcn/ui, Recharts 3, TanStack Query 5, Serwist 9, Fastify 5, Drizzle ORM 0.45, postgres.js 3, jose 6, argon2, Zod 4, Vitest 5, Playwright.

**Spec:** [`docs/superpowers/specs/2026-10-19-cash-tracker-design.md`](../specs/2026-10-19-cash-tracker-design.md)

---

## Global Constraints

- Node **24 LTS** (`.nvmrc` = `24`, `engines.node` = `>=24 <25`, imagem `node:24-alpine`). A máquina local tem Node 26: use `fnm`/`nvm` para rodar o 24.
- pnpm **10.34.7** via `"packageManager": "pnpm@10.34.7"`; `.npmrc` com `save-exact=true`; `pnpm-workspace.yaml` com `minimumReleaseAge: 10080`.
- **Versões exatas** (verificadas em 2026-10-19 com `npm audit` = 0 e `--strict-peer-deps` sem conflitos):

  | Pacote | Versão | Pacote | Versão |
  |---|---|---|---|
  | next | 16.4.2 | fastify | 5.12.7 |
  | react / react-dom | 19.3.1 | @fastify/cookie | 11.1.3 |
  | typescript | 6.0.3 | @fastify/helmet | 13.2.0 |
  | tailwindcss / @tailwindcss/postcss | 4.3.3 | @fastify/rate-limit | 11.2.1 |
  | zod | 4.6.7 | drizzle-orm | 0.45.4 |
  | postgres | 3.4.9 | jose | 6.2.12 |
  | argon2 | 0.45.1 | recharts | 3.10.1 |
  | @tanstack/react-query | 5.104.5 | @serwist/next / serwist | 9.5.13 |
  | lucide-react | 1.59.0 | radix-ui | 1.8.1 |
  | vaul | 1.1.2 | sonner | 2.0.8 |
  | class-variance-authority | 0.7.1 | tailwind-merge | 3.7.0 |
  | clsx | 2.1.1 | tw-animate-css | 1.4.0 |
  | @fontsource/inter / jetbrains-mono | 5.3.0 | tsx | 4.23.15 |
  | eslint | 10.13.0 | @eslint/js | 10.0.1 |
  | typescript-eslint | 8.72.0 | eslint-plugin-react-hooks | 7.1.1 |
  | globals | 17.13.0 | vitest | 5.0.5 |
  | vite | 8.3.4 | @vitejs/plugin-react | 6.1.2 |
  | jsdom | 30.1.3 | @playwright/test | 1.64.1 |
  | @testing-library/react | 16.3.3 | @testing-library/jest-dom | 7.0.1 |
  | @testing-library/user-event | 14.6.8 | @types/node | 24.19.2 |
  | @types/react / react-dom | 19.3.0 | | |

- **Proibidos** (vulnerabilidades conhecidas na data): `eslint-config-next` e `@next/eslint-plugin-next` (cadeia `fast-glob → micromatch → braces`, severidade alta) e `drizzle-kit` (`@esbuild-kit` → `esbuild <=0.24.2`). Migrations são SQL escrito à mão + migrator próprio (Tarefa 4). **TypeScript 7 não** (o `typescript-eslint` exige `<6.1.0`).
- Se qualquer versão acima acusar vulnerabilidade na hora da instalação, subir para o patch/minor mais recente que zere o `pnpm audit`. Nunca usar `--force` nem ignorar advisories.
- `pnpm audit` deve retornar **0 vulnerabilidades** ao fim de toda tarefa que adiciona dependência.
- Dinheiro sempre em **centavos inteiros** (`number` no TS, `bigint` no banco com `mode: "number"`). Teto: `100000000000`.
- Datas de lançamento `YYYY-MM-DD`; meses `YYYY-MM`; "hoje" e "mês corrente" em `America/Sao_Paulo`.
- Tabelas no schema Postgres **`app`** (não `public`).
- Todo texto de interface em **português do Brasil**; mensagens exatas das spec §6.6, §6.7 e §8.
- Erro da API sempre no formato `{ error: { code, message, fields?, requestId } }` (spec §7.6).
- Recurso de outro usuário → **404**, nunca 403.
- Somente tema escuro; tokens do Verdant §15 + extras da spec §9.1.
- Commits em português, no formato Conventional Commits, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Valor digitado em formato brasileiro.** Entradas como `"1.234,56"`, `"10,5"`, `"R$ 7"`, `"0,00"`, `"abc"`, `"1,234"` e `""`: os três primeiros convertem certo, e o resto vira `null` (não salva). O teste fica em `parseBrlToCents` (Tarefa 2).
2. **E-mail com maiúsculas ou espaços.** `"  Ana@Gmail.COM "` no cadastro e `ana@gmail.com` vindo do Google precisam cair no **mesmo** usuário. Os testes ficam no schema (Tarefa 2) e na vinculação Google (Tarefa 8).
3. **Virada de dia/mês no fuso de São Paulo.** Um lançamento feito em 31/10 às 22h em São Paulo (já 01/11 em UTC) deve ter a data padrão `2026-10-31` e entrar em outubro. Os testes ficam em `todaySaoPaulo`/`currentMonthSaoPaulo` (Tarefa 2) e em `/reports/monthly` (Tarefa 11).
4. **Duas abas renovando a sessão ao mesmo tempo.** O segundo uso do mesmo refresh token em menos de 30 s não pode derrubar a sessão; depois de 30 s, revoga a família. O teste fica na Tarefa 5. No front, várias requisições com 401 simultâneas disparam um único refresh (Tarefa 13).
5. **Categoria arquivada ou com tipo diferente em lançamentos antigos.** Editar um lançamento cuja categoria foi arquivada mantém a categoria. Trocar o tipo sem trocar a categoria dá `400`. Excluir uma categoria com lançamentos dá `409 CATEGORY_IN_USE`. Os testes ficam nas Tarefas 9 e 10.

---

## Estrutura de arquivos

```
cash_tracker/
├── .github/workflows/ci.yml          # T1 (base), T20 (completo)
├── .github/dependabot.yml            # T1
├── .nvmrc  .npmrc  package.json  pnpm-workspace.yaml  tsconfig.base.json  eslint.config.js   # T1
├── docker-compose.yml                # T3 (Postgres 17 dev + banco de teste)
├── packages/shared/src/
│   ├── money.ts  dates.ts  categories.ts         # T2
│   ├── schemas/{auth,categories,transactions,reports,errors}.ts  # T2
│   └── index.ts
├── apps/api/
│   ├── Dockerfile  .dockerignore  .env.example   # T12
│   ├── src/
│   │   ├── config/env.ts                         # T3
│   │   ├── app.ts  start.ts                      # T3 / T12
│   │   ├── http/{errors.ts, origin-guard.ts, auth-guard.ts}  # T3 / T6
│   │   ├── db/{client.ts, schema.ts, migrate.ts, migrations/0001_init.sql}  # T3 / T4
│   │   ├── email/{email-sender.ts, brevo.ts, console.ts, templates.ts}      # T7
│   │   ├── modules/auth/{jwt.ts, refresh-tokens.ts, passwords.ts, cookies.ts,
│   │   │                 auth.service.ts, auth.routes.ts,
│   │   │                 password-reset.service.ts,
│   │   │                 pkce.ts, google-client.ts, account-linking.ts, google.routes.ts}  # T5–T8
│   │   ├── modules/categories/{defaults.ts, categories.service.ts, categories.routes.ts}    # T6 / T9
│   │   ├── modules/transactions/{transactions.service.ts, transactions.routes.ts}           # T10
│   │   └── modules/reports/{reports.service.ts, reports.routes.ts}                          # T11
│   ├── scripts/generate-keys.ts                  # T5
│   └── test/{setup/global-setup.ts, helpers/{app.ts, users.ts}, fakes/google-server.ts, **/*.test.ts}
└── apps/web/
    ├── next.config.ts  postcss.config.mjs  components.json  .env.example  playwright.config.ts
    ├── src/proxy.ts                              # T12-W (CSP com nonce)
    ├── src/app/{layout.tsx, globals.css, manifest.ts, sw.ts}
    ├── src/app/(auth)/{login,cadastro,esqueci-senha,redefinir-senha}/page.tsx   # T14
    ├── src/app/(app)/{layout.tsx, visao-geral,lancamentos,gastos,entradas,ajustes}/page.tsx  # T15–T19
    ├── src/lib/{api-client.ts, session.tsx, query-client.ts, utils.ts}          # T13
    ├── src/components/ui/*                       # shadcn (T12-W)
    └── src/features/{shell,transactions,reports,settings,auth}/*                # T14–T19
```

As tarefas estão agrupadas em **etapas**. Cada etapa termina com software funcionando e testado.

---

# ETAPA 0 — Fundação do repositório

### Tarefa 1: Monorepo, toolchain e CI mínima

**Files:**
- Create: `.nvmrc`, `.npmrc`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.github/workflows/ci.yml`, `.github/dependabot.yml`
- Modify: `.gitignore` (adicionar `coverage/`, `playwright-report/`, `test-results/`)

**Interfaces:**
- Produces: scripts raiz `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit:ci` (= `pnpm audit`), cada um executando `pnpm -r --if-present <script>`; `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `module`/`moduleResolution` `NodeNext`, `target` `ES2023`, `verbatimModuleSyntax`.

- [ ] **Step 1:** Instalar o Node 24 localmente (`fnm install 24 && fnm use 24`) e ativar o pnpm (`corepack enable && corepack prepare pnpm@10.34.7 --activate`). Verificar: `node -v` → `v24.x`, `pnpm -v` → `10.34.7`.
- [ ] **Step 2:** Criar os arquivos de configuração. `pnpm-workspace.yaml`:
  ```yaml
  packages: ["apps/*", "packages/*"]
  minimumReleaseAge: 10080
  onlyBuiltDependencies: ["argon2"]
  ```
  `.npmrc`: `save-exact=true`, `engine-strict=true`. `package.json` raiz privado, com `packageManager`, `engines` e os scripts acima. Dev deps na raiz: `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `@types/node`.
- [ ] **Step 3:** `eslint.config.js` (flat config): `@eslint/js` recommended + `typescript-eslint` `recommendedTypeChecked` para `**/*.ts(x)`; `eslint-plugin-react-hooks` `recommended` apenas para `apps/web/**`; ignorar `dist`, `.next`, `coverage`.
- [ ] **Step 4:** CI `.github/workflows/ci.yml`: em `push` e `pull_request`, `ubuntu-latest`, `actions/setup-node` com `node-version-file: .nvmrc`, `pnpm/action-setup`, cache do pnpm, `pnpm install --frozen-lockfile`, `pnpm audit`, `pnpm lint`, `pnpm typecheck`. A Tarefa 20 completa o resto.
- [ ] **Step 5:** `dependabot.yml` semanal para `npm` (diretório `/`), `github-actions` e `docker` (`/apps/api`).
- [ ] **Step 6:** Rodar `pnpm install && pnpm audit && pnpm lint && pnpm typecheck`. Esperado: `No known vulnerabilities found`, e lint e typecheck sem erro (ainda sem pacotes).
- [ ] **Step 7: Commit:** `chore: monorepo pnpm, TypeScript, ESLint e CI base`.

---

# ETAPA 1 — Pacote compartilhado

### Tarefa 2: `@cash/shared` — dinheiro, datas, categorias e schemas Zod

**Files:**
- Create: `packages/shared/{package.json, tsconfig.json, vitest.config.ts}`, `src/money.ts`, `src/dates.ts`, `src/categories.ts`, `src/schemas/{auth,categories,transactions,reports,errors}.ts`, `src/index.ts`
- Test: `packages/shared/src/{money,dates}.test.ts`, `src/schemas/schemas.test.ts`

**Interfaces:**
- Produces (todos reexportados por `@cash/shared`):
  - `formatBrl(cents: number): string`: `Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})`.
  - `parseBrlToCents(input: string): number | null`.
  - `MAX_AMOUNT_CENTS = 100_000_000_000`.
  - `todaySaoPaulo(now?: Date): string` (`YYYY-MM-DD`), `currentMonthSaoPaulo(now?: Date): string` (`YYYY-MM`), `shiftMonth(month: string, delta: number): string`, `monthLabel(month: string): string` (`"outubro de 2026"`), `isMonthKey(s: string): boolean`.
  - `CATEGORY_ICONS` (readonly tuple com os ícones da spec §5 + `Car, Utensils, GraduationCap, Shirt, PiggyBank, Wallet, Plane, Dog, Baby, Wrench, Smartphone, Coffee`), `type CategoryIcon`.
  - `CATEGORY_COLORS` (readonly tuple de 10 hex com contraste AA sobre `#111714`: `#3ECF8E #60A5FA #FBBF24 #F87171 #A78BFA #F472B6 #34D399 #FB923C #22D3EE #94A69C`).
  - `DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; type: 'income'|'expense'; icon: CategoryIcon; color: string }>`, exatamente a tabela da spec §5, em ordem.
  - Schemas: `emailSchema` (trim + lowercase + `z.email()`), `passwordSchema` (8–128), `registerInput {name(1..80, trim), email, password}`, `loginInput {email, password: string min 1}`, `forgotPasswordInput {email}`, `resetPasswordInput {token: string min 20, password}`, `updateMeInput {name}`, `categoryCreateInput {name(1..40, trim), type, icon, color}`, `categoryUpdateInput` (parcial de name/icon/color + `archived?: boolean`, ao menos 1 campo), `transactionCreateInput {type, categoryId: uuid, amountCents: int 1..MAX, occurredOn: YYYY-MM-DD válido, description?: string trim máx. 140 \| null}`, `transactionUpdateInput` (parcial, ao menos 1 campo), `transactionListQuery {month?, type?, categoryId?, cursor?, limit: 1..100 default 50}`, `byCategoryQuery {type, month?, year?}` (exatamente um de month/year), `monthlyQuery {months: 1..24 default 12}`.
  - Tipos de resposta: `UserDto {id,name,email,avatarUrl,hasPassword,hasGoogle}`, `AuthResponse {accessToken, user: UserDto}`, `CategoryDto {id,name,type,icon,color,archived}`, `TransactionDto {id,type,amountCents,occurredOn,description,category: Pick<CategoryDto,'id'|'name'|'icon'|'color'>}`, `TransactionPage {items, nextCursor: string|null}`, `ByCategoryReport {period: {month?:string, year?:number}, totalCents, items: {categoryId,name,icon,color,archived,totalCents,share}[]}`, `MonthlyReport {items: {month,incomeCents,expenseCents,balanceCents}[]}`, `ApiErrorBody {error:{code:string,message:string,fields?:Record<string,string>,requestId?:string}}`.
- `package.json`: `"name": "@cash/shared"`, `"type": "module"`, `exports` → `./dist/index.js` (types `./dist/index.d.ts`), `build: tsc -p .`, `test: vitest run`. Dependência: `zod`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// money.test.ts
it.each([
  ["1.234,56", 123456], ["10,5", 1050], ["R$ 7", 700], ["  0,99 ", 99], ["1234", 123400],
])("parseBrlToCents(%s) = %i", (i, o) => expect(parseBrlToCents(i)).toBe(o));
it.each(["", "abc", "0,00", "0", "-5", "1,234", "12,3,4", "1000000000,01"])(
  "parseBrlToCents(%s) = null", (i) => expect(parseBrlToCents(i)).toBeNull());
it("formatBrl", () => expect(formatBrl(123456)).toBe("R$ 1.234,56"));

// dates.test.ts
const lateNightSP = new Date("2026-11-01T01:00:00Z"); // 31/10 22:00 em São Paulo
it("todaySaoPaulo", () => expect(todaySaoPaulo(lateNightSP)).toBe("2026-10-31"));
it("currentMonthSaoPaulo", () => expect(currentMonthSaoPaulo(lateNightSP)).toBe("2026-10"));
it("shiftMonth", () => { expect(shiftMonth("2026-01", -1)).toBe("2025-12"); expect(shiftMonth("2026-12", 1)).toBe("2027-01"); });
it("monthLabel", () => expect(monthLabel("2026-10")).toBe("outubro de 2026"));

// schemas.test.ts
it("normaliza e-mail", () => expect(registerInput.parse({ name: "Ana", email: "  Ana@Gmail.COM ", password: "12345678" }).email).toBe("ana@gmail.com"));
it("rejeita senha curta", () => expect(registerInput.safeParse({ name: "A", email: "a@b.co", password: "1234567" }).success).toBe(false));
it("rejeita data inválida", () => expect(transactionCreateInput.safeParse({ type: "expense", categoryId: crypto.randomUUID(), amountCents: 100, occurredOn: "2026-02-30" }).success).toBe(false));
it("byCategoryQuery exige month xor year", () => {
  expect(byCategoryQuery.safeParse({ type: "expense" }).success).toBe(false);
  expect(byCategoryQuery.safeParse({ type: "expense", month: "2026-10", year: 2026 }).success).toBe(false);
});
it("DEFAULT_CATEGORIES tem 9 saídas e 5 entradas", () => {
  expect(DEFAULT_CATEGORIES.filter(c => c.type === "expense")).toHaveLength(9);
  expect(DEFAULT_CATEGORIES.filter(c => c.type === "income")).toHaveLength(5);
});
```

- [ ] **Step 2:** `pnpm --filter @cash/shared test`. Esperado: FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar os módulos. `parseBrlToCents`:
  1. remove `R$` e espaços;
  2. aceita apenas `^\d{1,3}(\.\d{3})*(,\d{1,2})?$` ou `^\d+(,\d{1,2})?$`;
  3. remove os pontos, troca a vírgula por ponto e converte para centavos com aritmética inteira (separar a parte inteira da decimal; nunca `parseFloat * 100`);
  4. retorna `null` se o valor for `0` ou passar de `MAX_AMOUNT_CENTS`.

  As datas usam `Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'})`.
- [ ] **Step 4:** `pnpm --filter @cash/shared test && pnpm --filter @cash/shared build`. Esperado: PASS, com `dist/` gerado.
- [ ] **Step 5: Commit:** `feat(shared): utilitários de dinheiro/datas, categorias padrão e schemas Zod`.

---

# ETAPA 2 — API: base e banco

### Tarefa 3: Esqueleto da API (env, app factory, erros, health, Postgres local)

**Files:**
- Create: `docker-compose.yml`, `docker/postgres-init.sql`, `apps/api/{package.json, tsconfig.json, vitest.config.ts}`, `src/config/env.ts`, `src/db/client.ts`, `src/http/errors.ts`, `src/app.ts`, `test/helpers/app.ts`, `test/setup/global-setup.ts`
- Test: `apps/api/test/health.test.ts`, `test/errors.test.ts`, `src/config/env.test.ts`

**Interfaces:**
- Produces:
  - `loadEnv(source: Record<string,string|undefined>): Env`: Zod sobre as variáveis da spec §13.2 + `DATABASE_URL`, `LOG_LEVEL` (default `info`), `RATE_LIMIT_ENABLED` (default `true`). `JWT_PRIVATE_KEY` é decodificado de base64. Em erro, lança `Error("Variáveis de ambiente inválidas: <lista de chaves>")`.
  - `createDb(url: string): { db: Db; sql: postgres.Sql; close(): Promise<void> }`, com `postgres(url, { max: 5, prepare: false })` (`prepare:false` é exigido pelo pooler).
  - `class AppError extends Error { constructor(status: number, code: string, message: string, fields?: Record<string,string>) }` + atalhos `notFound()`, `conflict(code,msg)`, `badRequest(code,msg,fields?)`, `unauthorized(code,msg)`.
  - `registerErrorHandler(app)`:
    - `ZodError` → 400 `VALIDATION_ERROR`, com `fields` por caminho;
    - `AppError` → status/código próprios;
    - erro de rate limit → 429 `RATE_LIMITED`;
    - qualquer outro → 500 `INTERNAL_ERROR` com a mensagem "Algo deu errado. Tente novamente.".

    Sempre inclui o `requestId` (`req.id`).
  - `type AppDeps = { env: Env; db: Db; sql: postgres.Sql; emailSender: EmailSender; now?: () => Date; google?: GoogleEndpoints }`. `EmailSender`/`GoogleEndpoints` entram como tipos nas Tarefas 7 e 8; por ora use `unknown` opcional.
  - `buildApp(deps: AppDeps): Promise<FastifyInstance>`:
    - `logger` com o `redact` da spec §7.6;
    - `trustProxy: true`;
    - `genReqId` com `crypto.randomUUID`;
    - registra `@fastify/helmet` e o error handler;
    - rota `GET /health` (`SELECT 1` → `{status:"ok"}`).

    **Sem prefixo `/api`**: o rewrite da Vercel remove o `/api`.
  - Test helpers: `buildTestApp(overrides?: Partial<AppDeps>): Promise<{ app, deps, emails: SentEmail[] }>` e `resetDb(sql)` (`TRUNCATE` de todas as tabelas do schema `app` com `CASCADE`).
- `docker-compose.yml`: serviço `postgres:17-alpine`, porta `5432`, usuário/senha `cash`/`cash`, banco `cash`; o init script cria `cash_test`.
- `vitest.config.ts`: `globalSetup` (roda as migrations no `cash_test` a partir da Tarefa 4), `fileParallelism: false`, env `DATABASE_URL=postgres://cash:cash@localhost:5432/cash_test`.

- [ ] **Step 1: Testes que falham**

```ts
it("GET /health → 200 {status:'ok'}", async () => {
  const { app } = await buildTestApp();
  const r = await app.inject({ method: "GET", url: "/health" });
  expect(r.statusCode).toBe(200); expect(r.json()).toEqual({ status: "ok" });
});
it("erro inesperado → 500 com requestId e mensagem genérica", async () => {
  const { app } = await buildTestApp();
  app.get("/boom", async () => { throw new Error("segredo interno"); });
  const r = await app.inject({ method: "GET", url: "/boom" });
  expect(r.statusCode).toBe(500);
  expect(r.json().error).toMatchObject({ code: "INTERNAL_ERROR", message: "Algo deu errado. Tente novamente." });
  expect(r.json().error.requestId).toBeTypeOf("string");
  expect(r.body).not.toContain("segredo interno");
});
it("loadEnv lista as chaves ausentes", () => expect(() => loadEnv({})).toThrow(/APP_URL/));
```

- [ ] **Step 2:** `docker compose up -d && pnpm --filter @cash/api test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Deps: `fastify`, `@fastify/helmet`, `drizzle-orm`, `postgres`, `zod`, `@cash/shared` (`workspace:*`); dev: `tsx`, `vitest`. Scripts: `dev: tsx watch src/dev.ts` (carrega `.env` via `process.loadEnvFile()`), `build: tsc -p .`, `test: vitest run`, `typecheck: tsc --noEmit`, e `predev`/`pretest`/`pretypecheck`/`prebuild`: `pnpm --filter @cash/shared build`, porque a API consome o `dist/` do shared. A web não precisa disso: usa `transpilePackages`.
- [ ] **Step 4:** `pnpm --filter @cash/api test`. Esperado: PASS. Rodar `pnpm audit`: 0.
- [ ] **Step 5: Commit:** `feat(api): esqueleto Fastify com env validado, erros padronizados e /health`.

### Tarefa 4: Schema do banco e migrator SQL

**Files:**
- Create: `apps/api/src/db/migrations/0001_init.sql`, `src/db/migrate.ts`, `src/db/schema.ts`
- Modify: `test/setup/global-setup.ts` (chamar `runMigrations`)
- Test: `apps/api/src/db/migrate.test.ts`

**Interfaces:**
- Produces:
  - `runMigrations(sql: postgres.Sql, dir?: URL): Promise<string[]>`: retorna os nomes aplicados nesta execução.
  - `schema.ts` com `export const app = pgSchema("app")` e as tabelas `users, oauthAccounts, refreshTokens, passwordResetTokens, categories, transactions` em camelCase, espelhando a spec §5 (`amountCents: bigint({ mode: "number" })`, `occurredOn: date({ mode: "string" })`).
- `0001_init.sql`:
  - `CREATE SCHEMA IF NOT EXISTS app`;
  - as 6 tabelas da spec §5, com os mesmos `CHECK`s, FKs e índices (inclusive `CREATE UNIQUE INDEX categories_user_type_name_uq ON app.categories (user_id, type, lower(name))` e `transactions_user_date_idx ON app.transactions (user_id, occurred_on DESC, id DESC)`);
  - mais o `refresh_tokens_family_idx (family_id)`;
  - **e um trigger** que garante `transactions.type = categories.type` (defesa em profundidade ao lado da validação do service).

Algoritmo do migrator (não determinado pela assinatura):

```ts
// 1. CREATE TABLE IF NOT EXISTS app.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())
// 2. SELECT pg_advisory_lock(727274)            -- evita duas instâncias migrando juntas
// 3. arquivos *.sql do dir, ordenados por nome; pula os já presentes em schema_migrations
// 4. para cada pendente: sql.begin(tx => { tx.unsafe(conteúdo); INSERT INTO app.schema_migrations(name) })
// 5. finally: pg_advisory_unlock(727274)
```

- [ ] **Step 1: Teste que falha.** Em um schema limpo (`DROP SCHEMA app CASCADE`), a primeira chamada retorna `["0001_init.sql"]`, a segunda retorna `[]`, e `SELECT to_regclass('app.transactions')` não é nulo. Inserir um lançamento cujo tipo difere do tipo da categoria lança um erro do Postgres.
- [ ] **Step 2:** Rodar o teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar o SQL, o migrator e o `schema.ts`; ligar o migrator ao `global-setup`.
- [ ] **Step 4:** `pnpm --filter @cash/api test`. Esperado: PASS (inclusive os da Tarefa 3).
- [ ] **Step 5: Commit:** `feat(api): schema Postgres em SQL e migrator com advisory lock`.

---

# ETAPA 3 — Autenticação

### Tarefa 5: JWT RS256, refresh tokens rotativos e geração de chaves

**Files:**
- Create: `apps/api/src/modules/auth/{jwt.ts, refresh-tokens.ts, passwords.ts}`, `apps/api/scripts/generate-keys.ts`
- Test: `apps/api/src/modules/auth/{jwt,refresh-tokens,passwords}.test.ts`

**Interfaces:**
- Produces:
  - `createJwtService(env: Env, now?: () => Date): { sign(userId: string): Promise<string>; verify(token: string): Promise<{ userId: string }> }`:
    - `alg RS256`, `kid = env.JWT_KEY_ID`, `iss = env.APP_URL`, `aud = "cash-tracker-api"`, expira em `15m`;
    - a chave pública é derivada da privada com `crypto.createPublicKey`;
    - `verify` lança `AppError(401,"INVALID_TOKEN","Sessão expirada")`.
  - `createRefreshTokenStore(db: Db, now?: () => Date)`:
    - `issue(userId: string, userAgent?: string, familyId?: string): Promise<{ token: string; expiresAt: Date }>`: 32 bytes `base64url`, salva o SHA-256, validade de 30 dias.
    - `rotate(token: string, userAgent?: string): Promise<RotateResult>` com `type RotateResult = { status: "rotated"; userId: string; token: string; expiresAt: Date } | { status: "grace"; userId: string } | { status: "invalid" } | { status: "reuse_detected"; userId: string }`. Algoritmo exato da spec §6.2: janela de **30 s**; o caso `"reuse_detected"` revoga a família.
    - `revokeFamilyByToken(token: string): Promise<void>`.
    - `revokeAllForUser(userId: string): Promise<void>`.
  - `hashPassword(plain: string): Promise<string>` (argon2id), `verifyPassword(hash: string, plain: string): Promise<boolean>`, `verifyDummy(): Promise<void>` (verifica contra um hash fixo, para manter o tempo de resposta constante).
  - Script `pnpm --filter @cash/api keys:generate`: gera RSA 2048 e imprime `JWT_PRIVATE_KEY=<base64 do PEM PKCS8>` e `JWT_KEY_ID=<YYYY-MM>`.

- [ ] **Step 1: Testes que falham**

```ts
it("sign/verify ida e volta; token de outra chave é rejeitado", async () => { /* sign → verify().userId === id; token de outra chave → rejects.toMatchObject({ statusCode: 401 }) */ });
it("token expirado após 15 min é rejeitado", async () => { /* now() avançado 15m01s */ });
it("rotate devolve token novo e invalida o antigo", async () => { /* issue → rotate(t1).status==='rotated'; t2 !== t1 */ });
it("reuso dentro de 30 s → grace (abas concorrentes)", async () => { /* rotate(t1); avança 10s; rotate(t1).status === 'grace' */ });
it("reuso após 30 s → reuse_detected e família revogada", async () => {
  /* rotate(t1)->t2; avança 31s; rotate(t1).status==='reuse_detected'; rotate(t2).status==='invalid' */
});
it("token expirado → invalid", async () => { /* avança 30d+1s */ });
it("argon2: verifyPassword certo/errado", async () => { /* true / false */ });
```

- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar (deps: `jose`, `argon2`). As comparações de hash são feitas no banco por igualdade do SHA-256; não guardar token em claro.
- [ ] **Step 4:** Rodar. Esperado: PASS. `pnpm audit`: 0.
- [ ] **Step 5: Commit:** `feat(api): JWT RS256, refresh tokens rotativos com detecção de reuso e hash argon2id`.

### Tarefa 6: Rotas de cadastro, login, refresh, logout e `/me`

**Files:**
- Create: `apps/api/src/modules/auth/{cookies.ts, auth.service.ts, auth.routes.ts}`, `src/http/{origin-guard.ts, auth-guard.ts}`, `src/modules/categories/defaults.ts`, `test/helpers/users.ts`
- Modify: `src/app.ts` (registrar `@fastify/cookie`, `@fastify/rate-limit`, plugins de auth)
- Test: `apps/api/test/auth/session.test.ts`

**Interfaces:**
- Consumes: Tarefa 5 (`createJwtService`, `createRefreshTokenStore`, `hashPassword`, `verifyPassword`, `verifyDummy`), Tarefa 2 (`registerInput`, `loginInput`, `DEFAULT_CATEGORIES`, `UserDto`).
- Produces:
  - `setRefreshCookie(reply, token, expiresAt, env)` / `clearRefreshCookie(reply, env)`: nome `rt`, `httpOnly`, `sameSite: "lax"`, `path: "/api/auth"`, `secure: env.NODE_ENV === "production"`. O path inclui `/api` porque é o que o navegador vê.
  - `seedDefaultCategories(tx, userId: string): Promise<void>`.
  - `toUserDto(user, hasGoogle: boolean): UserDto`.
  - Decorator `app.authenticate` (preHandler): lê `Authorization: Bearer`, valida e define `req.userId: string`.
  - `originGuard` (preHandler para POSTs de `/auth/*`): o header `Origin` precisa ser igual a `env.APP_URL`; senão `403 FORBIDDEN_ORIGIN`.
  - Rotas: spec §7.1 (`register`, `login`, `refresh`, `logout`, `GET/PATCH /me`). `register` e `login` retornam `AuthResponse` e definem o cookie. O status `grace` do refresh retorna um access token novo **sem** definir cookie. `invalid` e `reuse_detected` → 401 `INVALID_REFRESH` + limpam o cookie.
  - Rate limits da spec §6.8 com `@fastify/rate-limit` (`global: false`, `config.rateLimit` por rota, `keyGenerator` conforme a tabela). Desativáveis com `RATE_LIMIT_ENABLED=false` nos testes, exceto no teste específico de limite.
  - Helper de teste: `registerUser(app, overrides?) → { accessToken, cookie, user }`.

- [ ] **Step 1: Testes que falham**

```ts
const H = { origin: "http://localhost:3000" }; // APP_URL de teste
it("register cria usuário, 14 categorias padrão e cookie rt", async () => {
  /* 201; body.user.hasPassword===true; Set-Cookie contém 'rt=' 'HttpOnly' 'Path=/api/auth' 'SameSite=Lax';
     SELECT count(*) FROM app.categories WHERE user_id=… → 14 */ });
it("register com e-mail existente (case diferente) → 409", async () => { /* 'ANA@x.com' após 'ana@x.com' */ });
it("login errado → 401 'E-mail ou senha incorretos'", async () => {});
it("login de conta só-Google → 401 code USE_GOOGLE", async () => { /* usuário inserido com password_hash NULL */ });
it("refresh com cookie válido → novo accessToken e novo cookie", async () => {});
it("POST /auth/refresh sem Origin correto → 403 FORBIDDEN_ORIGIN", async () => {});
it("logout revoga: refresh seguinte → 401", async () => {});
it("GET /me sem token → 401; com token → UserDto", async () => {});
it("6º login em 1 min (mesmo IP+e-mail) → 429", async () => { /* app com RATE_LIMIT_ENABLED=true */ });
```

- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Cadastro e seed de categorias **na mesma transação**. Login de usuário inexistente chama `verifyDummy()` antes do 401.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(api): cadastro, login, refresh rotativo, logout, /me, CSRF por Origin e rate limit`.

### Tarefa 7: Esqueceu a senha + envio de e-mail (Brevo/console)

**Files:**
- Create: `apps/api/src/email/{email-sender.ts, brevo.ts, console.ts, templates.ts}`, `src/modules/auth/password-reset.service.ts`
- Modify: `src/modules/auth/auth.routes.ts`, `src/app.ts` (escolher o sender por `EMAIL_PROVIDER`)
- Test: `apps/api/test/auth/password-reset.test.ts`, `src/email/brevo.test.ts`

**Interfaces:**
- Produces:
  - `interface EmailSender { send(msg: { to: string; subject: string; html: string; text: string }): Promise<void> }`.
  - `createBrevoSender(env, fetchFn = fetch): EmailSender`: `POST https://api.brevo.com/v3/smtp/email`, headers `api-key`, `content-type: application/json`, corpo `{ sender:{email:EMAIL_FROM,name:EMAIL_FROM_NAME}, to:[{email}], subject, htmlContent, textContent }`; resposta não-2xx → lança erro (logado, nunca exposto ao cliente).
  - `createConsoleSender(log): EmailSender`: loga o texto. Nos testes, `buildTestApp` injeta um sender que acumula em `emails[]`.
  - `resetPasswordEmail(link: string): { subject: "Redefinir sua senha — Cash Tracker"; html; text }`: o texto contém o link e "O link expira em 30 minutos".
  - Rotas `POST /auth/forgot-password` e `POST /auth/reset-password` (spec §6.7, mensagens exatas). O envio do e-mail é **não bloqueante**: a resposta 202 não espera o Brevo, mas o erro é logado.

- [ ] **Step 1: Testes que falham**

```ts
it("forgot com e-mail inexistente → 202 e nenhum e-mail", async () => {});
it("forgot com e-mail existente → 202 e e-mail com link APP_URL/redefinir-senha?token=", async () => {});
it("reset válido troca a senha, marca email_verified, revoga sessões", async () => {
  /* refresh com cookie antigo → 401; login com nova senha → 200; usuário.email_verified===true */ });
it("token usado de novo → 400 'Link inválido ou expirado'", async () => {});
it("token após 30 min → 400", async () => { /* now() + 31m */ });
it("novo forgot invalida o token anterior", async () => {});
it("conta só-Google consegue definir senha via reset", async () => { /* depois hasPassword===true */ });
it("brevo envia payload correto e lança erro em 4xx", async () => { /* fetchFn mock */ });
```

- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(api): redefinição de senha por e-mail com Brevo e sender de console`.

### Tarefa 8: Login com Google (OAuth 2.0 + PKCE + verificação do ID Token + vinculação)

**Files:**
- Create: `apps/api/src/modules/auth/{pkce.ts, google-client.ts, account-linking.ts, google.routes.ts}`, `test/fakes/google-server.ts`
- Test: `apps/api/src/modules/auth/{pkce,account-linking}.test.ts`, `test/auth/google.test.ts`

**Interfaces:**
- Produces:
  - `type GoogleEndpoints = { authUrl: string; tokenUrl: string; jwksUrl: string; issuers: string[] }`. Padrão: os da spec §6.4.
  - `createPkcePair(): { verifier: string; challenge: string }`, `challengeFor(verifier: string): string`, `randomToken(bytes = 32): string`.
  - `createGoogleClient(env, endpoints, fetchFn = fetch)`:
    - `buildAuthUrl({ state, nonce, challenge }): string`;
    - `exchangeCode(code: string, verifier: string): Promise<{ idToken: string }>`;
    - `verifyIdToken(idToken: string, nonce: string): Promise<GoogleProfile>`, com `type GoogleProfile = { sub: string; email: string; name: string; picture?: string }`. Usa `createRemoteJWKSet`; checa `iss` ∈ issuers, `aud`, `exp`, `nonce` e `email_verified === true` (senão lança).
  - `linkGoogleAccount(db, profile: GoogleProfile, refreshStore): Promise<{ userId: string; created: boolean }>`: a árvore exata da spec §6.5, numa transação; o e-mail é normalizado (trim + lowercase) antes da busca.
  - Rotas `GET /auth/google` e `GET /auth/google/callback` (spec §6.4):
    - cookie `g_oauth` **assinado** (`@fastify/cookie` com `COOKIE_SECRET`), `path: "/api/auth/google"`, `maxAge: 300`, contendo JSON `{state, nonce, verifier}`;
    - `state` comparado com `crypto.timingSafeEqual`;
    - sucesso → cookie `rt` + `302 ${APP_URL}/visao-geral`;
    - qualquer falha → `302 ${APP_URL}/login?erro=google` + log `warn` com o motivo.
  - `test/fakes/google-server.ts`: `startFakeGoogle(): Promise<{ endpoints: GoogleEndpoints; issueCode(claims: Partial<IdClaims>): string; close() }>`. É um servidor HTTP local em porta aleatória que serve o JWKS com uma chave gerada no teste e um `/token` que valida o `code_verifier` contra o challenge registrado e devolve um `id_token` assinado.

- [ ] **Step 1: Testes que falham**

```ts
it("PKCE: vetor do RFC 7636", () =>
  expect(challengeFor("dBjftJeZ4CVP-mJ92K9pp_DpHM3AEhgRqiM7OS6qJCW")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"));
it("/auth/google redireciona com S256, state, nonce, scope e prompt", async () => {
  /* 302; Location começa com endpoints.authUrl; params code_challenge_method=S256, scope='openid email profile',
     prompt=select_account, redirect_uri=GOOGLE_REDIRECT_URI; Set-Cookie g_oauth HttpOnly */ });
it("callback feliz cria usuário (email_verified, sem senha) + categorias e redireciona para /visao-geral", async () => {});
it("callback com state diferente → /login?erro=google", async () => {});
it("callback sem cookie g_oauth → /login?erro=google", async () => {});
it("id_token com aud errado / nonce errado / email_verified=false → /login?erro=google", async () => {});
it("vincula a usuário existente com e-mail verificado (mesma conta, senha mantida)", async () => {});
it("usuário com senha e e-mail NÃO verificado: vincula, apaga senha e revoga sessões antigas", async () => {});
it("e-mail do Google 'Ana@Gmail.com' encontra usuário 'ana@gmail.com'", async () => {});
it("segundo login com o mesmo sub não duplica oauth_accounts", async () => {});
```

- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Esperado: PASS. `pnpm audit`: 0.
- [ ] **Step 5: Commit:** `feat(api): login com Google via OAuth 2.0 + PKCE, verificação do ID Token e vinculação de contas`.

---

# ETAPA 4 — API: domínio financeiro

### Tarefa 9: Categorias

**Files:**
- Create: `apps/api/src/modules/categories/{categories.service.ts, categories.routes.ts}`
- Test: `apps/api/test/categories.test.ts`

**Interfaces:**
- Consumes: `app.authenticate`, `categoryCreateInput`, `categoryUpdateInput`, `CategoryDto`.
- Produces: rotas da spec §7.2; `getOwnedCategory(db, userId, id): Promise<CategoryRow>` (404 se não existe ou é de outro usuário), usada na Tarefa 10.

- [ ] **Step 1: Testes que falham:**
  - `GET ?type=expense` lista as 9 padrão em ordem alfabética, sem as arquivadas; `includeArchived=true` inclui as arquivadas.
  - Criar "delivery" (minúsculo) quando "Delivery" já existe → 409 `CATEGORY_EXISTS`.
  - `PATCH {archived:true}` → `archived:true`.
  - `PATCH {type:"income"}` → 400 (o tipo é imutável).
  - `DELETE` de categoria sem lançamentos → 204; com lançamentos → 409 `CATEGORY_IN_USE`, mensagem "Esta categoria tem lançamentos. Arquive-a em vez de excluir.".
  - Usuário B fazendo `GET/PATCH/DELETE` numa categoria de A → 404.
  - Ícone fora de `CATEGORY_ICONS` → 400.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Rate limit global autenticado de 300/min por `userId`.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(api): CRUD de categorias com arquivamento`.

### Tarefa 10: Lançamentos

**Files:**
- Create: `apps/api/src/modules/transactions/{transactions.service.ts, transactions.routes.ts}`
- Test: `apps/api/test/transactions.test.ts`

**Interfaces:**
- Consumes: `getOwnedCategory` (T9), `transactionCreateInput`, `transactionUpdateInput`, `transactionListQuery`, `TransactionDto`, `TransactionPage`.
- Produces: rotas da spec §7.3. Cursor = `base64url(JSON.stringify([occurredOn, id]))`, com a consulta `WHERE (occurred_on, id) < ($1, $2)`. Cursor malformado → 400 `INVALID_CURSOR`.

- [ ] **Step 1: Testes que falham:**
  - Criar uma saída em "Delivery" → 201 com `category {id,name,icon,color}`.
  - Criar uma saída usando categoria de entrada → 400 `TYPE_MISMATCH`.
  - `PATCH {type:"income"}` sem trocar a categoria → 400 `TYPE_MISMATCH`.
  - Criar com uma categoria **arquivada** → 400 `CATEGORY_ARCHIVED`; mas `PATCH {amountCents}` num lançamento antigo cuja categoria foi arquivada depois → 200, categoria mantida.
  - Listagem: `month=2026-10` traz só outubro, em ordem `occurredOn DESC, id DESC`. Com 3 itens e `limit=2`: `nextCursor` não nulo, e a segunda página traz 1 item com `nextCursor: null`.
  - `amountCents: 0` → 400; `100000000001` → 400.
  - Usuário B acessando lançamento de A → 404; B criando com uma categoria de A → 404.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(api): CRUD de lançamentos com paginação por cursor`.

### Tarefa 11: Relatórios

**Files:**
- Create: `apps/api/src/modules/reports/{reports.service.ts, reports.routes.ts}`
- Test: `apps/api/test/reports.test.ts`

**Interfaces:**
- Consumes: `byCategoryQuery`, `monthlyQuery`, `currentMonthSaoPaulo`, `deps.now`.
- Produces: rotas da spec §7.4. `share` = `totalCents / periodTotal`, arredondado com 4 casas decimais. `period` ecoa o `month` ou o `year`.

Consulta mensal (decisão não óbvia: meses zerados incluídos e fuso de São Paulo):

```sql
WITH months AS (
  SELECT to_char(m, 'YYYY-MM') AS month, m::date AS start, (m + interval '1 month')::date AS end
  FROM generate_series(($1 || '-01')::date - make_interval(months => $2 - 1), ($1 || '-01')::date, interval '1 month') AS m
)
SELECT months.month,
       COALESCE(SUM(t.amount_cents) FILTER (WHERE t.type = 'income'), 0)::bigint  AS income_cents,
       COALESCE(SUM(t.amount_cents) FILTER (WHERE t.type = 'expense'), 0)::bigint AS expense_cents
FROM months
LEFT JOIN app.transactions t ON t.user_id = $3 AND t.occurred_on >= months.start AND t.occurred_on < months.end
GROUP BY months.month ORDER BY months.month;
-- $1 = currentMonthSaoPaulo(now()), $2 = months, $3 = userId; balance = income - expense em TS
```

- [ ] **Step 1: Testes que falham:**
  - `by-category` de saídas em outubro: com 3 lançamentos em 2 categorias, os itens vêm em ordem desc, `share` soma 1 e as categorias sem valor não aparecem.
  - `year=2026` agrega o ano todo.
  - Categoria arquivada com valor no período aparece com `archived: true`.
  - `monthly?months=12` com `now = 2026-11-01T01:00Z` (31/10 em SP): 12 itens de `2025-11` a `2026-10`, com os meses vazios zerados e `balanceCents = income − expense` (inclusive negativo).
  - Dados de outro usuário não entram nas somas.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(api): relatórios por categoria e mensal`.

---

# ETAPA 5 — API em container

### Tarefa 12: Dockerfile, inicialização com migrations e `.env.example`

**Files:**
- Create: `apps/api/{Dockerfile, .dockerignore, .env.example}`, `src/start.ts`, `src/dev.ts`
- Modify: `apps/api/package.json` (`start: node dist/start.js`, e a pasta `migrations` copiada para `dist/db/migrations` no build)

**Interfaces:**
- Produces:
  - `start.ts`: `loadEnv(process.env)` → `createDb` → `runMigrations` → `buildApp` → `listen({ host: "0.0.0.0", port: env.PORT })`.
  - Tratamento de `SIGTERM`: `app.close()` + `sql.end()`.
  - Dockerfile multi-stage conforme a spec §13.4 (contexto = raiz do repositório):
    - `pnpm fetch` → `pnpm install --offline --frozen-lockfile`;
    - build de `@cash/shared` e `@cash/api`;
    - `pnpm deploy --filter @cash/api --prod /out`;
    - imagem final `node:24-alpine`, `USER node`, `HEALTHCHECK` via `wget -qO- http://localhost:$PORT/health`, `CMD ["node","dist/start.js"]`.
  - `.env.example` com todas as chaves da spec §13.2, valores fictícios e comentários.

- [ ] **Step 1:** `docker build -f apps/api/Dockerfile -t cash-api .`. Esperado: build OK.
- [ ] **Step 2:** `docker run --rm --network host --env-file apps/api/.env -e PORT=4000 cash-api` e, em outro terminal, `curl -s localhost:4000/health`. Esperado: `{"status":"ok"}`, e o log mostra `0001_init.sql` aplicado (ou nada a aplicar).
- [ ] **Step 3:** Verificar se há vulnerabilidade na imagem: `docker scout cves cash-api` (se disponível) ou `trivy image cash-api`. Esperado: nenhuma CVE crítica/alta corrigível. Se houver, atualizar a tag `node:24-alpine` com digest fixado.
- [ ] **Step 4: Commit:** `build(api): Dockerfile multi-stage não-root com migrations na inicialização`.

---

# ETAPA 6 — Frontend

### Tarefa 12-W: Esqueleto Next.js, design system, proxy e headers de segurança

**Files:**
- Create: `apps/web/{package.json, tsconfig.json, next.config.ts, postcss.config.mjs, components.json, vitest.config.ts, .env.example}`, `src/app/{layout.tsx, globals.css, page.tsx}`, `src/proxy.ts`, `src/lib/utils.ts`, `src/components/ui/{button,input,label,card,sheet,drawer,dialog,tabs,tooltip,skeleton,sonner,table}.tsx`
- Test: `apps/web/src/app/layout.test.tsx`, `apps/web/next.config.test.ts`

**Interfaces:**
- Produces:
  - `next.config.ts`:
    - `rewrites()` → `[{ source: "/api/:path*", destination: \`${process.env.API_URL}/:path*\` }]`, falhando no build se `API_URL` não estiver definida;
    - `headers()` com HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
    - `transpilePackages: ["@cash/shared"]`.
  - `src/proxy.ts` (o "middleware" do Next 16): gera um nonce por requisição e define a CSP da spec §10 (`script-src 'self' 'nonce-…' 'strict-dynamic'`; `img-src 'self' data: https://lh3.googleusercontent.com`; `connect-src 'self'`; `frame-ancestors 'none'`).
  - `globals.css`:
    - Tailwind 4 `@theme` mapeando os tokens do Verdant §15 e os extras da spec §9.1 (`--color-background`, `--color-surface`, `--color-surface-elevated`, `--color-border`, `--color-primary`, `--color-danger`, `--color-success`, `--color-info`, `--color-warning`, textos, raios, `--radius-pill`, `--ease-editorial`, `--text-display`);
    - `color-scheme: dark`;
    - `font-variant-numeric: tabular-nums` na classe `.num` (JetBrains Mono);
    - `@media (prefers-reduced-motion: reduce)` zerando `transition-duration` e `animation-duration`.
  - `layout.tsx`: `lang="pt-BR"`, importa `@fontsource/inter/{400,500,600,700}.css` e `@fontsource/jetbrains-mono/{400,500}.css`, `<meta name="theme-color" content="#0B0F0E">`, `viewport-fit=cover`, `<Toaster/>` (sonner).
  - Componentes shadcn gerados com `pnpm dlx shadcn@latest add …` e ajustados aos tokens:
    - `Button` variantes `primary | secondary | ghost | danger` e tamanho `pill` (`rounded-[var(--radius-pill)]`, altura 48px);
    - `Input` com altura 44px e foco `ring-2 ring-primary ring-offset-2`.

- [ ] **Step 1: Testes que falham:**
  - O `layout` renderiza `<html lang="pt-BR">`.
  - `rewrites()` com `API_URL=https://x.onrender.com` retorna o destino `https://x.onrender.com/:path*`.
  - `rewrites()` sem `API_URL` lança erro.
- [ ] **Step 2:** `pnpm --filter @cash/web test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar (deps da tabela de versões: `next react react-dom tailwindcss @tailwindcss/postcss radix-ui vaul sonner lucide-react class-variance-authority tailwind-merge clsx tw-animate-css @fontsource/*`; dev: `vitest @vitejs/plugin-react jsdom @testing-library/* vite`). Scripts: `dev: next dev -p 3000`, `build: next build`, `test: vitest run`, `typecheck: tsc --noEmit`.
- [ ] **Step 4:** `pnpm --filter @cash/web test && API_URL=http://localhost:4000 pnpm --filter @cash/web build`. Esperado: PASS e build OK. `pnpm audit`: 0.
- [ ] **Step 5:** Com `pnpm dev` (web + api), `curl -s localhost:3000/api/health` → `{"status":"ok"}`, o que comprova o proxy.
- [ ] **Step 6: Commit:** `feat(web): Next.js com tokens do design system, proxy /api e headers de segurança`.

### Tarefa 13: Cliente HTTP, sessão e React Query

**Files:**
- Create: `apps/web/src/lib/{api-client.ts, session.tsx, query-client.ts}`, `src/features/shell/WakingBanner.tsx`
- Test: `apps/web/src/lib/{api-client,session}.test.tsx`

**Interfaces:**
- Consumes: tipos `AuthResponse`, `UserDto`, `ApiErrorBody` de `@cash/shared`.
- Produces:
  - `class ApiError extends Error { status: number; code: string; fields?: Record<string,string> }`.
  - `createApiClient(opts: { fetchFn?: typeof fetch; onSessionLost: () => void; onSlow?: (slow: boolean) => void; slowAfterMs?: number /* 3000 */ })`, que retorna:
    - `request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T>`: prefixa `/api`, envia `credentials: "same-origin"` e `Authorization` quando houver token;
    - `setAccessToken(t: string|null): void`;
    - `refresh(): Promise<AuthResponse|null>`: **dedup** com uma única promise em andamento.

    Em 401 numa rota que não é `/auth/*`: chama `refresh()` uma vez e repete a requisição; se ainda falhar, chama `onSessionLost()`. Uma requisição com mais de `slowAfterMs` chama `onSlow(true)`, e `onSlow(false)` quando termina.
  - `SessionProvider` + `useSession(): { status: "loading"|"authenticated"|"anonymous"; user: UserDto|null; login(email,password): Promise<void>; register(input): Promise<void>; logout(): Promise<void>; api: ApiClient }`. Ao montar, chama `refresh()` para restaurar a sessão.
  - `WakingBanner`: aviso discreto "Acordando o servidor…" (`role="status"`, `aria-live="polite"`).

- [ ] **Step 1: Testes que falham (fetch mockado):**
  - Três requisições paralelas recebendo 401 → **um único** `POST /api/auth/refresh` e as três refeitas com o token novo.
  - Refresh falhando → `onSessionLost` chamado uma vez.
  - Requisição de 3,5 s → `onSlow(true)` e depois `onSlow(false)` (com fake timers).
  - Erro 400 com `fields` → `ApiError` com `fields`.
  - `SessionProvider` com refresh OK → `status: "authenticated"`; com 401 → `"anonymous"`.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar (dep: `@tanstack/react-query`).
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(web): cliente HTTP com refresh deduplicado e provedor de sessão`.

### Tarefa 14: Telas de autenticação

**Files:**
- Create: `apps/web/src/app/(auth)/{layout.tsx, login/page.tsx, cadastro/page.tsx, esqueci-senha/page.tsx, redefinir-senha/page.tsx}`, `src/features/auth/{AuthHero.tsx, GoogleButton.tsx, PasswordField.tsx, LoginForm.tsx, RegisterForm.tsx, ForgotForm.tsx, ResetForm.tsx}`
- Test: `apps/web/src/features/auth/*.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `api.request`, schemas `loginInput`, `registerInput`, `forgotPasswordInput`, `resetPasswordInput`.
- Produces:
  - `AuthHero`: eyebrow "CONTROLE FINANCEIRO" + título em `--text-display`.
  - `GoogleButton`: `<a href="/api/auth/google">` pílula, "Entrar com Google", com o ícone do Google em SVG inline.
  - O layout `(auth)` redireciona para `/visao-geral` se a sessão já está ativa.

  Mensagens exatas:

  | Situação | Mensagem |
  |---|---|
  | `?erro=google` | "Não foi possível entrar com o Google. Tente novamente." |
  | `USE_GOOGLE` | a mensagem da spec §6.6 |
  | Forgot enviado | "Se o e-mail existir, enviamos um link. Confira também a caixa de spam." |
  | Reset OK | volta ao `/login?redefinida=1` com "Senha redefinida. Entre com a nova senha." |
  | Reset 400 | "Link inválido ou expirado" + link "Pedir um novo" |

  A confirmação de senha diferente mostra "As senhas não coincidem" (validação no cliente).

- [ ] **Step 1: Testes que falham (Testing Library):**
  - O login com credenciais inválidas mostra "E-mail ou senha incorretos".
  - `/login?erro=google` mostra a mensagem acima.
  - O cadastro mostra o erro de campo vindo de `fields` na senha.
  - Esqueci-senha sempre mostra a mensagem neutra.
  - O reset com confirmação diferente não chama a API.
  - O link "Esqueceu a sua senha?" aponta para `/esqueci-senha`.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar, com mobile-first, `autocomplete` correto (`email`, `current-password`, `new-password`) e `inputmode="email"`.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(web): telas de login, cadastro, esqueci a senha e redefinição`.

### Tarefa 15: Shell do app (navegação + novo lançamento)

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx`, `src/features/shell/{AppShell.tsx, BottomNav.tsx, Sidebar.tsx, Fab.tsx, nav-items.ts}`, `src/features/transactions/{TransactionSheet.tsx, AmountInput.tsx, CategoryChips.tsx, queries.ts}`
- Test: `apps/web/src/features/transactions/{AmountInput,TransactionSheet}.test.tsx`, `src/features/shell/BottomNav.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `parseBrlToCents`, `formatBrl`, `todaySaoPaulo`, `transactionCreateInput`.
- Produces:
  - `NAV_ITEMS`: Visão geral `/visao-geral` (`LayoutDashboard`), Lançamentos `/lancamentos` (`ArrowLeftRight`), Gastos `/gastos` (`TrendingDown`), Entradas `/entradas` (`TrendingUp`), Ajustes `/ajustes` (`Settings2`).
  - O layout `(app)` redireciona para `/login` quando `status === "anonymous"` e mostra um skeleton durante `"loading"`.
  - `useTransactionSheet(): { open(tx?: TransactionDto): void }` (context). `Fab` e o botão da Sidebar chamam `open()`.
  - `AmountInput({ value: string, onChange, error? })`: `inputMode="decimal"`, prefixo "R$", fonte mono `text-3xl`.
  - Queries: `useCategories(type)`, `useCreateTransaction()`, `useUpdateTransaction()`, `useDeleteTransaction()`. Ao terminar, invalidam `["transactions"]` e `["reports"]`.
  - `TransactionSheet`: vaul `Drawer` abaixo de 768px e `Dialog` acima. Fluxo da spec §8.3. Ao salvar: toast "Lançamento salvo". Excluir pede confirmação ("Excluir este lançamento?").

- [ ] **Step 1: Testes que falham:**
  - `AmountInput` com "12,3" → `parseBrlToCents` = 1230 no submit.
  - "abc" → o erro "Informe um valor válido" bloqueia o submit.
  - O sheet abre com Saída selecionada, data = `todaySaoPaulo()` e chips só de saídas não arquivadas.
  - Trocar para Entrada troca os chips e limpa a categoria.
  - Submit envia `{type, categoryId, amountCents, occurredOn, description}`.
  - No modo edição, o botão "Excluir" aparece.
  - `BottomNav` marca o item ativo com `aria-current="page"`.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar:
  - `BottomNav` fixa com `pb-[env(safe-area-inset-bottom)]`, visível abaixo de 768px;
  - `Sidebar` recolhida (só ícones + tooltip) de 768px a 1023px e completa a partir de 1024px;
  - `Fab` pílula com 56px de altura;
  - alvos de toque de pelo menos 44px.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(web): shell responsivo com barra inferior, sidebar e formulário de lançamento`.

### Tarefa 16: Tela de lançamentos

**Files:**
- Create: `apps/web/src/app/(app)/lancamentos/page.tsx`, `src/features/transactions/{TransactionList.tsx, TransactionFilters.tsx}`, `src/features/reports/MonthPicker.tsx`
- Test: `apps/web/src/features/transactions/TransactionList.test.tsx`, `src/features/reports/MonthPicker.test.tsx`

**Interfaces:**
- Produces:
  - `MonthPicker({ value: string, onChange, allowYear?: boolean, yearSelected?: boolean, onYearToggle? })`: botões ‹ › com `aria-label` "Mês anterior"/"Próximo mês", rótulo `monthLabel`, e o "›" desabilitado no mês corrente.
  - O estado do mês fica na URL (`?mes=2026-10`), o que preserva a navegação ao voltar.
  - `useTransactions(filters)` com `useInfiniteQuery` (cursor).
  - `TransactionList`: itens agrupados por dia ("sábado, 18 de outubro"), com o total do dia, valor mono com sinal `+`/`−` e cor `success`/`danger`, e ícone da categoria. Tocar num item abre o `TransactionSheet` em edição. Carrega mais ao rolar (`IntersectionObserver`).
  - Estados: skeleton; vazio "Nenhum lançamento em {mês}." + botão "Registrar lançamento"; erro com "Tentar de novo".

- [ ] **Step 1: Testes que falham:**
  - Dois lançamentos no mesmo dia são agrupados sob um cabeçalho, com o total do dia.
  - A saída aparece com "−" e `text-danger`.
  - O estado vazio mostra o texto exato.
  - `MonthPicker` desabilita "Próximo mês" no mês corrente.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(web): lista de lançamentos por mês com filtros e rolagem infinita`.

### Tarefa 17: Dashboards de gastos e de entradas

**Files:**
- Create: `apps/web/src/app/(app)/{gastos,entradas}/page.tsx`, `src/features/reports/{CategoryReportView.tsx, CategoryBarChart.tsx, ChartTable.tsx, queries.ts}`
- Test: `apps/web/src/features/reports/{CategoryBarChart,CategoryReportView}.test.tsx`

**Interfaces:**
- Consumes: `/reports/by-category`, `MonthPicker`.
- Produces:
  - `CategoryReportView({ type: "expense"|"income" })`: as duas páginas só a instanciam com o tipo.
  - Cabeçalho: eyebrow "GASTOS"/"ENTRADAS", total do período em `--text-display` mono, `MonthPicker` com o toggle "Ano todo" (`?ano=2026`).
  - `CategoryBarChart({ items, color })`: Recharts `BarChart layout="vertical"`, altura = `items.length * 44`, cor única (`var(--color-danger)` para gastos, `var(--color-success)` para entradas). O rótulo à esquerda tem ícone + nome; o da direita, `formatBrl` + `%`. Tooltip com o valor exato. `isAnimationActive` desligado quando o usuário prefere movimento reduzido.
  - `ChartTable({ caption, columns, rows })`: tabela acessível. O botão "Ver como tabela" alterna entre gráfico e tabela (`aria-pressed`).
  - Vazio: "Nenhum gasto em {período}." / "Nenhuma entrada em {período}." + CTA.

- [ ] **Step 1: Testes que falham:**
  - Com 3 itens, aparecem 3 rótulos na ordem recebida.
  - Clicar em "Ver como tabela" mostra uma `<table>` com os valores `formatBrl` e o %.
  - O toggle "Ano todo" muda a query para `year`.
  - O estado vazio mostra o texto exato.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar (dep: `recharts`). Wrapper `ResponsiveContainer`, componente client-only.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(web): dashboards de gastos e entradas por categoria`.

### Tarefa 18: Visão geral

**Files:**
- Create: `apps/web/src/app/(app)/visao-geral/page.tsx`, `src/features/reports/{MonthlyChart.tsx, SummaryCards.tsx}`
- Test: `apps/web/src/features/reports/{SummaryCards,MonthlyChart}.test.tsx`

**Interfaces:**
- Consumes: `/reports/monthly?months=12`, `/transactions?limit=5`, `ChartTable`.
- Produces:
  - `SummaryCards({ month: MonthlyReport["items"][number] })`: o saldo do mês corrente em `--text-display` mono, com sinal e ícone `TrendingUp`/`TrendingDown`; cards "Ganhos" e "Gastos".
  - `MonthlyChart({ items })`: `ComposedChart` com barras de ganhos (`success`) e gastos (`danger`) e uma linha da diferença (`info`); eixo X com o mês abreviado ("out"). No mobile, o contêiner tem rolagem horizontal com largura mínima de `items.length * 56px`, e o scroll inicial fica no fim (meses recentes à vista).
  - Lista "Últimos lançamentos" (5) reutilizando os itens de `TransactionList`, com o link "Ver todos".

- [ ] **Step 1: Testes que falham:**
  - Saldo negativo mostra "−R$ 50,00" com `TrendingDown` e o texto acessível "Saldo negativo".
  - A tabela alternativa tem 12 linhas, com as colunas Mês/Ganhos/Gastos/Diferença.
  - Mês zerado mostra "R$ 0,00", e não vazio.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar. A raiz `/` (`app/page.tsx`) redireciona para `/visao-geral` ou `/login` conforme a sessão.
- [ ] **Step 4:** Rodar. Esperado: PASS.
- [ ] **Step 5: Commit:** `feat(web): visão geral com saldo do mês e gráfico de 12 meses`.

### Tarefa 19: Ajustes (categorias, perfil, instalar app) + PWA

**Files:**
- Create: `apps/web/src/app/(app)/ajustes/page.tsx`, `src/features/settings/{CategoryManager.tsx, CategoryForm.tsx, ProfileForm.tsx, InstallAppButton.tsx, useInstallPrompt.ts}`, `src/app/{manifest.ts, sw.ts}`, `public/icons/{icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png}`
- Modify: `next.config.ts` (envolver com `withSerwist({ swSrc: "src/app/sw.ts", swDest: "public/sw.js", disable: dev })`)
- Test: `apps/web/src/features/settings/{CategoryManager,InstallAppButton}.test.tsx`

**Interfaces:**
- Produces:
  - `CategoryManager`: abas Saídas/Entradas; criar e editar (nome, ícone de `CATEGORY_ICONS`, cor de `CATEGORY_COLORS`); arquivar/desarquivar; excluir. No `409 CATEGORY_IN_USE`, mostra a mensagem e o botão "Arquivar".
  - `ProfileForm`: edita o nome (`PATCH /me`), mostra o e-mail e os métodos de login ("Google", "Senha"); botão "Sair".
  - `useInstallPrompt(): { platform: "installed"|"prompt"|"ios"|"unsupported"; install(): Promise<void> }`:
    - `installed` quando `matchMedia('(display-mode: standalone)')` bate ou `navigator.standalone`;
    - `prompt` quando chegou o `beforeinstallprompt`;
    - `ios` quando o user agent é iPhone/iPad e não está em standalone.
  - `InstallAppButton`:
    - `prompt` → botão "Instalar app";
    - `ios` → instruções "Toque em Compartilhar e depois em 'Adicionar à Tela de Início'";
    - `installed`/`unsupported` → nada.
  - `manifest.ts`: `name: "Cash Tracker"`, `short_name: "Cash"`, `start_url: "/visao-geral"`, `display: "standalone"`, `background_color` e `theme_color` `#0B0F0E`, `lang: "pt-BR"`, ícones 192/512 e maskable.
  - `sw.ts`: Serwist com `precacheEntries` e cache **apenas** de assets estáticos (`/_next/static`, fontes, ícones). Requisições `/api/*` nunca são cacheadas (`NetworkOnly`).
  - Ícones gerados a partir de um SVG simples (monograma "C" em `#3ECF8E` sobre `#0B0F0E`), com o script `pnpm --filter @cash/web icons` usando `sharp` **apenas se** ele passar no audit. Se não passar, os PNGs são exportados manualmente e commitados.

- [ ] **Step 1: Testes que falham:**
  - O `409 CATEGORY_IN_USE` mostra o botão "Arquivar".
  - `useInstallPrompt` com o UA do iPhone → `ios`; com o evento disparado → `prompt`, e `install()` chama `prompt()`.
  - Em standalone, `InstallAppButton` não renderiza nada.
  - `manifest()` tem `display: "standalone"` e `start_url: "/visao-geral"`.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar (deps: `@serwist/next`, `serwist`).
- [ ] **Step 4:** Rodar os testes e depois `API_URL=http://localhost:4000 pnpm --filter @cash/web build`. Esperado: PASS e `public/sw.js` gerado. `pnpm audit`: 0.
- [ ] **Step 5:** Verificação manual: no Chrome DevTools → Application → Manifest, sem erros e com "Installable".
- [ ] **Step 6: Commit:** `feat(web): ajustes de categorias e perfil, PWA instalável`.

---

# ETAPA 7 — Qualidade de ponta a ponta

### Tarefa 20: E2E com Playwright e CI completa

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/{auth.spec.ts, transactions.spec.ts, password-reset.spec.ts}`, `apps/api/src/modules/dev/test-mailbox.routes.ts`
- Modify: `.github/workflows/ci.yml`, `apps/api/src/app.ts`

**Interfaces:**
- Produces:
  - `GET /__test/last-email?to=` registrado **somente** quando `EMAIL_PROVIDER=memory` (valor aceito por `loadEnv` apenas com `NODE_ENV=test`); retorna o último e-mail enviado. Um teste garante que a rota responde 404 com `EMAIL_PROVIDER=brevo`.
  - Playwright com os projetos `iPhone 15` (`devices["iPhone 15"]`) e `Desktop Chrome`, e `webServer` subindo a API (`NODE_ENV=test`, `EMAIL_PROVIDER=memory`, banco `cash_e2e`) e a web (`next build && next start`).
  - Fluxos:
    1. Cadastro → `/visao-geral` → FAB "+" → R$ 45,90 em Delivery → aparece em `/lancamentos` e em `/gastos` (barra "Delivery" com R$ 45,90).
    2. Logout → login com a mesma senha.
    3. Esqueci a senha → link lido de `/__test/last-email` → nova senha → login.
    4. O mesmo e-mail com maiúsculas no login funciona.
  - Checagem de que não há rolagem horizontal da página no iPhone: `document.documentElement.scrollWidth <= innerWidth`, em todas as rotas do app.
  - CI completa (spec §13.5): job `test` com o service `postgres:17-alpine`; build da web; `docker build` da API; job `e2e` instalando os browsers do Playwright e publicando o relatório como artifact quando falhar.

- [ ] **Step 1:** Escrever as specs E2E acima.
- [ ] **Step 2:** `pnpm --filter @cash/web exec playwright test`. Esperado: FAIL até a rota de teste existir.
- [ ] **Step 3:** Implementar a rota de teste e o workflow.
- [ ] **Step 4:** Rodar o E2E localmente nos dois projetos. Esperado: PASS. Fazer push e conferir a CI verde no GitHub.
- [ ] **Step 5: Commit:** `test: E2E Playwright (iPhone e desktop) e CI completa`.

---

# ETAPA 8 — Deploy em produção (custo zero)

### Tarefa 21: Guia de deploy e publicação

Esta tarefa é majoritariamente **operacional** (contas e painéis). Os passos marcados com 👤 são do dono do projeto. O agente prepara a documentação e valida.

**Files:**
- Create: `docs/deploy.md`
- Modify: `README.md` (seção "Como rodar localmente" + links para o deploy), `docs/setup-google-oauth.md` (se algo mudou)

**Interfaces:**
- Produces: `docs/deploy.md` com uma seção por serviço, na ordem abaixo, cada uma com o passo a passo e as variáveis exatas da spec §13.2.

- [ ] **Step 1: Escrever `docs/deploy.md`** cobrindo:
  1. **Supabase:**
     - criar o projeto Free na região `us-east-1` e guardar a senha do banco;
     - em Connect → **Session pooler**, copiar a URI (porta 5432) e acrescentar `?sslmode=require`;
     - opcional e recomendado: criar o role `cash_app` com permissão só no schema `app`.
  2. **Brevo:**
     - criar a conta;
     - em Senders, adicionar e verificar o e-mail remetente;
     - em SMTP & API → API Keys, gerar `BREVO_API_KEY`.
  3. **Chaves JWT:** rodar `pnpm --filter @cash/api keys:generate` localmente; nunca commitar o resultado.
  4. **Render:**
     - New → Web Service → conectar o repositório `bernardo246/cashtracker`;
     - Runtime Docker, Dockerfile path `apps/api/Dockerfile`, Docker context `.`;
     - região Virginia, plano Free;
     - Health Check Path `/health`;
     - todas as variáveis da API;
     - `APP_URL` e `GOOGLE_REDIRECT_URI` usam a URL da Vercel do passo 5.
  5. **Vercel:**
     - Add New → Project → importar o repositório;
     - Root Directory `apps/web` (com a opção de incluir arquivos fora do root ligada, para o monorepo);
     - variável `API_URL=https://<api>.onrender.com`;
     - fazer o deploy e anotar a URL de produção.
  6. **Google Cloud:** seguir `docs/setup-google-oauth.md` com a URL da Vercel.
  7. **cron-job.org:** criar a conta e um job GET `https://<app>.vercel.app/api/health` a cada 10 minutos.
  8. **Checklist pós-deploy:**
     - `curl https://<app>.vercel.app/api/health`;
     - cadastro, login, lançamento e dashboards no celular;
     - "Esqueceu a senha" recebendo o e-mail;
     - login com Google;
     - instalar o PWA no Android e no iPhone.
- [ ] **Step 2:** 👤 Executar os passos 1–7 seguindo o guia.
- [ ] **Step 3:** Validar o checklist do passo 8 em produção (agente com o navegador + 👤 no celular).
- [ ] **Step 4: Commit:** `docs: guia de deploy (Supabase, Render, Vercel, Brevo, Google, cron)`.

---

## Mapa de cobertura da spec

| Spec | Tarefas |
|---|---|
| §2 Escopo / §8 Frontend | 12-W, 13–19 |
| §3 Arquitetura (proxy, APP_URL) | 3, 12-W |
| §4 Stack / §11 Dependências | 1 + Global Constraints, `pnpm audit` em cada tarefa |
| §5 Modelo de dados | 4, 6 (seed), 9, 10 |
| §6.1–6.3 Tokens, rotação, CSRF | 5, 6 |
| §6.4–6.5 Google + vinculação | 8 |
| §6.6 E-mail/senha | 6 |
| §6.7 Esqueceu a senha | 7, 14 |
| §6.8 Rate limit | 6, 9 |
| §7 API e erros | 3, 6–11 |
| §8.6 PWA | 19 |
| §9 Design system | 12-W, 14–19 |
| §10 Segurança | 3 (helmet), 12-W (CSP/headers), 12 (container não-root) |
| §12 Testes | todas (TDD), 20 (E2E) |
| §13 Ambientes e deploy | 3 (compose), 12 (Docker), 20 (CI), 21 |
| §14 Documentação | 12 (`.env.example`), 21 |
| §15 Riscos | 13 (WakingBanner), 7 (aviso de spam), 3 (`/health` com `SELECT 1`) |
