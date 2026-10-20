# Cash Tracker — Especificação de Design

- **Data:** 2026-10-19
- **Status:** aprovado em conversa (seções 1–4); aguardando revisão desta spec escrita
- **Repositório:** https://github.com/bernardo246/cashtracker

---

## 1. Objetivo

Aplicação web pessoal, **mobile-first e instalável (PWA)**, para registrar entradas e saídas de dinheiro por categoria e visualizar:

1. gastos por categoria;
2. entradas por categoria;
3. por mês: soma dos ganhos, soma dos gastos e a diferença.

### Critérios de sucesso

- Registrar um gasto no celular em ~3 toques após abrir o app.
- Login com Google (fluxo OAuth 2.0 + PKCE executado pelo backend) e com e-mail/senha, incluindo "esqueceu a sua senha?".
- Funcionar bem em iPhone (Safari) e Android (Chrome), inclusive instalado como PWA.
- **Custo zero** de infraestrutura.
- `pnpm audit` sem nenhuma vulnerabilidade e dependências compatíveis entre si.

### Restrições

| Restrição | Origem |
|---|---|
| Frontend Next.js na Vercel | Usuário |
| Backend em Docker no Render | Usuário |
| Banco Postgres no Supabase | Usuário |
| Fluxo Google em 10 passos com JWT RS256 + refresh token emitidos pelo próprio backend | Usuário |
| Design: Verdant (base) + Medical Sports × Locomotive (camada editorial) | Usuário |
| Custo zero (sem domínio próprio, sem lojas de apps) | Usuário |

---

## 2. Escopo

### Dentro da v1

- Cadastro/login com e-mail e senha; login com Google; vinculação de contas pelo e-mail.
- Redefinição de senha por e-mail.
- CRUD de lançamentos (entrada/saída) com valor em R$, categoria, data e descrição opcional.
- Categorias padrão por usuário + criar, renomear, alterar ícone/cor, arquivar/desarquivar, excluir (somente sem lançamentos).
- Dashboards: Visão geral (12 meses), Gastos por categoria, Entradas por categoria (mês selecionável ou ano todo).
- PWA instalável (sem uso offline).
- Tema escuro único.

### Fora da v1

Lançamentos recorrentes · exportação CSV · contas/investimentos/transferências · multi-moeda · tema claro · uso offline · confirmação obrigatória de e-mail no cadastro.

---

## 3. Arquitetura

```
 Navegador (PWA)                 Vercel                       Render (Docker)            Supabase
┌──────────────┐   HTTPS   ┌───────────────────┐  rewrite  ┌──────────────────┐  pooler ┌──────────┐
│ Next.js app  │──────────▶│ seuapp.vercel.app │──/api/*──▶│ Fastify API      │────────▶│ Postgres │
│ (React, PWA) │◀──────────│ páginas + proxy   │◀──────────│ auth + finanças  │◀────────│          │
└──────────────┘           └───────────────────┘           └──────┬───────────┘         └──────────┘
                                                                  │ HTTPS
                                                   ┌──────────────┴─────────────┐
                                                   │ Google OAuth   │  Brevo API │
                                                   └────────────────────────────┘
```

### 3.1 Princípio central: mesmo domínio via proxy

O navegador só se comunica com `https://<app>.vercel.app`. O `next.config` define um rewrite `/api/:path*` → `${API_URL}/:path*` (Render). Consequências:

- Cookies emitidos pela API (refresh token, cookie temporário do OAuth) são **de primeira parte** no domínio da Vercel, compatíveis com o ITP do Safari/iOS.
- Não há CORS a configurar; a API não aceita requisições cross-origin de navegador.
- A redirect URI cadastrada no Google é `https://<app>.vercel.app/api/auth/google/callback`.
- A API monta URLs absolutas a partir da variável `APP_URL`, **nunca** de headers da requisição.

### 3.2 Unidades

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| `packages/shared` | Schemas Zod (entrada/saída das rotas), tipos, utilitários de dinheiro (centavos ↔ string BRL) e mês (`YYYY-MM`) | Zod |
| `apps/api` — módulo `auth` | Cadastro, login, refresh, logout, Google OAuth, redefinição de senha, emissão/verificação de JWT | `db`, `email`, `jose`, `argon2` |
| `apps/api` — módulo `categories` | CRUD de categorias, seed das padrão | `db` |
| `apps/api` — módulo `transactions` | CRUD de lançamentos, paginação por cursor | `db` |
| `apps/api` — módulo `reports` | Agregados por categoria e por mês (SQL) | `db` |
| `apps/api` — `email` | Interface `EmailSender` com implementações `BrevoEmailSender` e `ConsoleEmailSender` | `fetch` nativo |
| `apps/api` — `db` | Schema Drizzle, migrations, conexão | Drizzle, `postgres` |
| `apps/web` — `lib/api` | Cliente HTTP: anexa access token, refresh automático com deduplicação, tratamento de 401 | `shared` |
| `apps/web` — `features/*` | Telas e componentes de auth, lançamentos, dashboards, ajustes | `lib/api`, TanStack Query, Recharts, shadcn/ui |

Cada módulo da API expõe um *plugin* Fastify (rotas) e um *service* (regras de negócio, testável sem HTTP).

---

## 4. Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 LTS |
| Gerenciador | pnpm 10 (workspaces, versões exatas, `minimumReleaseAge` de 7 dias) |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (Radix), Lucide React, Recharts, TanStack Query, Serwist (PWA), `@fontsource/inter`, `@fontsource/jetbrains-mono` |
| Backend | Fastify, `@fastify/cookie`, `@fastify/helmet`, `@fastify/rate-limit`, pino (embutido), TypeScript |
| Banco | PostgreSQL 17 (Supabase), Drizzle ORM + `drizzle-kit`, driver `postgres` |
| Auth | `jose`, `argon2` |
| E-mail | Brevo (API HTTP v3 via `fetch`) |
| Testes | Vitest, Testing Library, Playwright |
| CI | GitHub Actions + Dependabot |

As versões exatas são definidas no plano de implementação, no momento da instalação, verificando `pnpm audit` limpo e compatibilidade de peer dependencies.

---

## 5. Modelo de dados

```sql
users (
  id              uuid PK default gen_random_uuid(),
  email           text NOT NULL,            -- armazenado em minúsculas
  name            text NOT NULL,
  avatar_url      text NULL,
  password_hash   text NULL,                -- argon2id; NULL se conta só Google
  email_verified  boolean NOT NULL default false,
  created_at      timestamptz NOT NULL default now(),
  updated_at      timestamptz NOT NULL default now(),
  UNIQUE (email)
)

oauth_accounts (
  id                uuid PK,
  user_id           uuid NOT NULL FK users ON DELETE CASCADE,
  provider          text NOT NULL,          -- 'google'
  provider_user_id  text NOT NULL,          -- claim 'sub'
  created_at        timestamptz NOT NULL default now(),
  UNIQUE (provider, provider_user_id)
)

refresh_tokens (
  id           uuid PK,
  user_id      uuid NOT NULL FK users ON DELETE CASCADE,
  family_id    uuid NOT NULL,
  token_hash   text NOT NULL UNIQUE,        -- SHA-256 hex do token opaco
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz NULL,
  replaced_by  uuid NULL FK refresh_tokens,
  rotated_at   timestamptz NULL,
  user_agent   text NULL,
  created_at   timestamptz NOT NULL default now()
)

password_reset_tokens (
  id          uuid PK,
  user_id     uuid NOT NULL FK users ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,         -- criação + 30 min
  used_at     timestamptz NULL,
  created_at  timestamptz NOT NULL default now()
)

categories (
  id           uuid PK,
  user_id      uuid NOT NULL FK users ON DELETE CASCADE,
  name         text NOT NULL,               -- 1..40 caracteres
  type         text NOT NULL CHECK (type IN ('income','expense')),
  icon         text NOT NULL,               -- nome de ícone Lucide de uma lista permitida
  color        text NOT NULL,               -- hex de uma paleta permitida
  archived_at  timestamptz NULL,
  created_at   timestamptz NOT NULL default now(),
  UNIQUE (user_id, type, lower(name))       -- índice único por expressão
)

transactions (
  id            uuid PK,
  user_id       uuid NOT NULL FK users ON DELETE CASCADE,
  category_id   uuid NOT NULL FK categories ON DELETE RESTRICT,
  type          text NOT NULL CHECK (type IN ('income','expense')),
  amount_cents  bigint NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000000),
  occurred_on   date NOT NULL,
  description   text NULL,                  -- até 140 caracteres
  created_at    timestamptz NOT NULL default now(),
  updated_at    timestamptz NOT NULL default now()
)
INDEX transactions (user_id, occurred_on DESC, id DESC)
```

### Regras

- `transactions.type` deve ser igual a `categories.type` da categoria referenciada (validado no service; erro `400`).
- Categoria arquivada não aparece nos seletores de novo lançamento, mas continua nos relatórios e na edição de lançamentos antigos.
- `DELETE /categories/:id` só é permitido se não houver lançamentos; caso contrário `409` com sugestão de arquivar.
- Todas as consultas filtram por `user_id` do JWT. Acesso a recurso de outro usuário retorna `404`.
- Valores monetários trafegam na API como **inteiros em centavos**.
- Datas de lançamento trafegam como `YYYY-MM-DD`; meses como `YYYY-MM`.

### Categorias padrão (criadas no primeiro acesso de cada usuário)

| Tipo | Nome | Ícone Lucide |
|---|---|---|
| expense | Delivery | `Bike` |
| expense | Combustível | `Fuel` |
| expense | Mercado | `ShoppingCart` |
| expense | Moradia | `House` |
| expense | Transporte | `Bus` |
| expense | Saúde | `HeartPulse` |
| expense | Lazer | `Gamepad2` |
| expense | Assinaturas | `Repeat` |
| expense | Outros | `Ellipsis` |
| income | Salário | `Briefcase` |
| income | Freelance | `Laptop` |
| income | Investimentos | `TrendingUp` |
| income | Presente | `Gift` |
| income | Outros | `Ellipsis` |

---

## 6. Autenticação

### 6.1 Tokens

| Token | Formato | Validade | Onde fica |
|---|---|---|---|
| Access | JWT RS256, claims `sub` (user id), `iat`, `exp`, `iss`=`APP_URL`, `aud`=`cash-tracker-api`, header `kid` | 15 min | Memória do front (variável JS) |
| Refresh | 32 bytes aleatórios em base64url; banco guarda SHA-256 | 30 dias | Cookie `rt`: `httpOnly; Secure; SameSite=Lax; Path=/api/auth` |
| Estado OAuth | Cookie assinado (`@fastify/cookie` + `COOKIE_SECRET`) com `state`, `code_verifier` e `nonce` | 5 min | Cookie `g_oauth`: `httpOnly; Secure; SameSite=Lax; Path=/api/auth/google` |

- Par RSA (2048 bits) gerado por `pnpm --filter api keys:generate`; a chave privada vai para `JWT_PRIVATE_KEY` (PEM em base64) no Render. A chave pública é derivada da privada em tempo de execução.
- Em dev, sem `Secure` (http://localhost).

### 6.2 Refresh com rotação

1. `POST /api/auth/refresh` lê o cookie `rt` e busca o hash.
2. Inexistente ou expirado → `401` e o cookie é apagado.
3. **Revogado** → `401`.
4. **Já rotacionado:**
   - se `rotated_at` tem **menos de 30 s** (tolerância para abas concorrentes), devolve um novo access token sem rotacionar de novo;
   - se tem mais de 30 s, é reuso: **revoga toda a família**, responde `401` e registra um log de segurança.
5. Válido: cria um novo refresh na mesma família, marca o antigo com `rotated_at`/`replaced_by`, define o novo cookie e retorna `{ accessToken, user }`.

No front, chamadas concorrentes de refresh são deduplicadas (uma única promise em andamento).

### 6.3 CSRF

- Cookies `SameSite=Lax` não são enviados em POST cross-site.
- Toda rota `POST` sob `/api/auth/*` exige header `Origin` igual a `APP_URL`; caso contrário `403`.
- Rotas de dados exigem `Authorization: Bearer`, que não é enviado automaticamente pelo navegador.

### 6.4 Login com Google — 10 passos

1. Usuário clica "Entrar com Google" (link para `/api/auth/google`).
2. Browser → `GET /api/auth/google` (proxy Vercel → API).
3. API gera `state` (32 bytes), `nonce` (32 bytes) e `code_verifier` (43–128 chars); calcula `code_challenge = BASE64URL(SHA256(verifier))`; grava o cookie `g_oauth`; responde `302` para `https://accounts.google.com/o/oauth2/v2/auth` com `client_id`, `redirect_uri`, `response_type=code`, `scope=openid email profile`, `state`, `nonce`, `code_challenge`, `code_challenge_method=S256`, `prompt=select_account`.
4. Usuário escolhe a conta e consente.
5. Google → `GET /api/auth/google/callback?code=…&state=…` (ou `?error=…`).
6. API lê e **apaga** `g_oauth`; compara `state` em tempo constante; troca `code` + `code_verifier` em `https://oauth2.googleapis.com/token` (POST com `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`).
7. API **verifica o ID Token** com `jose.jwtVerify` contra o JWKS remoto `https://www.googleapis.com/oauth2/v3/certs` (cacheado): `iss` ∈ {`https://accounts.google.com`, `accounts.google.com`}, `aud` = `GOOGLE_CLIENT_ID`, `exp` válido, `nonce` igual ao do cookie, `email_verified === true`.
8. Cria ou encontra o usuário (§6.5).
9. Emite refresh token (cookie `rt`). O access token é obtido pelo front via `/api/auth/refresh`.
10. `302` para `APP_URL/visao-geral`.

Erros em qualquer passo → `302` para `APP_URL/login?erro=google` (sem detalhes na URL; detalhes no log com `requestId`).

### 6.5 Vinculação de contas (passo 8)

```
existe oauth_accounts(google, sub)?
├─ sim → usuário vinculado; atualiza avatar/nome se vazios.
└─ não → existe users(email = email do Google)?
         ├─ sim, email_verified = true  → cria oauth_accounts; entra.
         ├─ sim, email_verified = false → cria oauth_accounts; password_hash := NULL;
         │                                 email_verified := true; revoga todos os refresh
         │                                 tokens existentes; entra.
         └─ não → cria users (email_verified = true, sem senha) + oauth_accounts
                  + categorias padrão; entra.
```

A regra `email_verified = false` impede que alguém que cadastrou o e-mail de outra pessoa mantenha acesso depois que o dono real entra com Google.

### 6.6 E-mail e senha

- `POST /auth/register` `{ name, email, password }` → cria o usuário (`email_verified = false`), as categorias padrão e a sessão. E-mail já existente → `409` "Este e-mail já tem uma conta. Entre ou use 'Esqueceu a senha'".
- Senha: 8–128 caracteres; hash **argon2id** (parâmetros padrão da lib `argon2`).
- `POST /auth/login` `{ email, password }`:
  - credencial errada ou usuário inexistente → `401` "E-mail ou senha incorretos" (tempo constante: executa um verify de hash fictício quando o usuário não existe);
  - usuário sem senha (só Google) → `401` com `code: "USE_GOOGLE"` e a mensagem "Esta conta usa o Google. Entre com o Google ou defina uma senha em 'Esqueceu a senha'".

### 6.7 Esqueceu a senha

1. `POST /auth/forgot-password` `{ email }` → **sempre** `202` "Se o e-mail existir, enviamos um link".
2. Se o usuário existe: invalida tokens de reset anteriores não usados, cria um token (32 bytes, hash no banco, 30 min) e envia o e-mail com `APP_URL/redefinir-senha?token=…`.
3. `POST /auth/reset-password` `{ token, password }`:
   - token inválido, expirado ou usado → `400` "Link inválido ou expirado";
   - válido → grava o novo hash, `email_verified := true`, `used_at := now()`, **revoga todos os refresh tokens** do usuário → `200`; o front redireciona para `/login` com aviso de sucesso.
4. Funciona também para contas só Google que queiram definir uma senha.

### 6.8 Rate limiting

| Rota | Limite | Chave |
|---|---|---|
| `POST /auth/login` | 5/min | IP + e-mail |
| `POST /auth/register` | 5/h | IP |
| `POST /auth/forgot-password` | 3/h | e-mail (e 10/h por IP) |
| `POST /auth/reset-password` | 10/h | IP |
| `POST /auth/refresh` | 30/min | IP |
| Demais rotas autenticadas | 300/min | user id |

Armazenamento em memória (instância única). `trustProxy` configurado para obter o IP real via `X-Forwarded-For`.

---

## 7. API

Base: `/api` no domínio do front (proxy). Todas as rotas recebem e retornam JSON validado por schemas de `packages/shared`.

### 7.1 Auth e usuário

| Método | Rota | Corpo / Query | Resposta |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | `201 { accessToken, user }` + cookie |
| POST | `/auth/login` | `{ email, password }` | `200 { accessToken, user }` + cookie |
| POST | `/auth/refresh` | cookie `rt` | `200 { accessToken, user }` + cookie |
| POST | `/auth/logout` | cookie `rt` | `204`, revoga a família, apaga o cookie |
| GET | `/auth/google` | — | `302` Google |
| GET | `/auth/google/callback` | `code`, `state` | `302` front |
| POST | `/auth/forgot-password` | `{ email }` | `202` |
| POST | `/auth/reset-password` | `{ token, password }` | `200` |
| GET | `/me` | — | `{ id, name, email, avatarUrl, hasPassword, hasGoogle }` |
| PATCH | `/me` | `{ name }` | `200 user` |

### 7.2 Categorias

| Método | Rota | Detalhes |
|---|---|---|
| GET | `/categories?type=income\|expense&includeArchived=true\|false` | ordenadas por nome |
| POST | `/categories` | `{ name, type, icon, color }` → `201`; nome duplicado → `409` |
| PATCH | `/categories/:id` | `{ name?, icon?, color?, archived? }`; o tipo é imutável |
| DELETE | `/categories/:id` | `204`; com lançamentos → `409 { code: "CATEGORY_IN_USE" }` |

### 7.3 Lançamentos

| Método | Rota | Detalhes |
|---|---|---|
| GET | `/transactions?month=YYYY-MM&type=&categoryId=&cursor=&limit=` | ordem `occurred_on DESC, id DESC`; `limit` padrão 50 (máx. 100); resposta `{ items, nextCursor }`; cada item inclui `category { id, name, icon, color }` |
| POST | `/transactions` | `{ type, categoryId, amountCents, occurredOn, description? }` → `201` |
| PATCH | `/transactions/:id` | campos parciais; revalida tipo × categoria |
| DELETE | `/transactions/:id` | `204` |

### 7.4 Relatórios

| Método | Rota | Resposta |
|---|---|---|
| GET | `/reports/by-category?type=expense&month=YYYY-MM` ou `&year=YYYY` | `{ period, totalCents, items: [{ categoryId, name, icon, color, archived, totalCents, share }] }`, ordenado por `totalCents` desc; categorias sem valor no período são omitidas |
| GET | `/reports/monthly?months=12` | `{ items: [{ month: "YYYY-MM", incomeCents, expenseCents, balanceCents }] }`, do mais antigo ao mais recente, terminando no mês corrente, **incluindo meses zerados** (`generate_series`) |

O "mês corrente" é calculado no fuso `America/Sao_Paulo`.

### 7.5 Infra

- `GET /health` → `200 { status: "ok" }` após um `SELECT 1` no banco (mantém o Supabase ativo).

### 7.6 Erros

Formato único: `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": { "amountCents": "…" }, "requestId": "…" } }`.

| Status | Uso |
|---|---|
| 400 | Validação (com `fields`), tipo × categoria incompatível, token de reset inválido |
| 401 | Não autenticado, credenciais inválidas, refresh inválido |
| 403 | `Origin` inválido em POST de auth |
| 404 | Recurso inexistente **ou de outro usuário** |
| 409 | Conflito (e-mail existente, categoria duplicada ou em uso) |
| 429 | Rate limit (com `Retry-After`) |
| 500 | Erro inesperado (mensagem genérica + `requestId`) |

Logs com pino; `redact` para `req.headers.authorization`, `req.headers.cookie`, `res.headers["set-cookie"]`, `*.password`, `*.token`.

---

## 8. Frontend

### 8.1 Rotas

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | — | Redireciona para `/visao-geral` (logado) ou `/login` |
| `/login` | público | Display editorial, "Entrar com Google" (pílula), formulário e-mail/senha, links para cadastro e "Esqueceu a sua senha?"; mostra o erro de `?erro=google` |
| `/cadastro` | público | Nome, e-mail, senha (com mostrar/ocultar) |
| `/esqueci-senha` | público | E-mail → mensagem neutra + "confira também a caixa de spam" |
| `/redefinir-senha?token=` | público | Nova senha + confirmação |
| `/visao-geral` | logado | Saldo do mês (display, mono, verde/vermelho + sinal), cards de ganhos e gastos do mês, gráfico dos 12 meses, últimos 5 lançamentos |
| `/lancamentos` | logado | Seletor de mês, filtros de tipo e categoria, lista agrupada por dia com total do dia, rolagem infinita |
| `/gastos` | logado | Seletor de mês ‹ › + "Ano todo", total do período, barras horizontais por categoria |
| `/entradas` | logado | Igual a `/gastos`, para entradas |
| `/ajustes` | logado | Perfil (nome), categorias (abas Saídas/Entradas), instalar app, sair |

A proteção de rotas é feita no cliente: o layout autenticado tenta `/api/auth/refresh` ao montar; sem sessão, redireciona para `/login`.

### 8.2 Navegação

- **Mobile (< 768px):** barra inferior fixa com Visão geral · Lançamentos · Gastos · Entradas · Ajustes (ícone + label) e um **FAB pílula "+"** acima dela, à direita, respeitando `env(safe-area-inset-bottom)`.
- **Desktop (≥ 1024px):** sidebar fixa com os mesmos itens + botão primário "Novo lançamento".
- **Tablet:** sidebar recolhida (só ícones, com tooltip).

### 8.3 Novo/editar lançamento

- Mobile: *bottom sheet* (Drawer do shadcn); desktop: Dialog.
- Ordem: toggle **Saída | Entrada** → valor (`inputmode="decimal"`, máscara `R$ 0,00`, foco automático) → chips de categoria do tipo selecionado (sem arquivadas) → data (padrão hoje) → descrição opcional → "Salvar".
- Na edição: botão "Excluir" com confirmação.
- Após salvar: o sheet fecha, toast "Lançamento salvo" e as queries de lançamentos e relatórios são invalidadas.

### 8.4 Gráficos (Recharts)

- **Por categoria:** `BarChart` com `layout="vertical"` (barras horizontais), uma barra por categoria, rótulo com ícone + nome à esquerda e valor + % à direita. Cor única: `--danger` para gastos, `--success` para entradas. Altura = nº de categorias × 44px.
- **Visão geral (12 meses):** barras agrupadas por mês (ganhos `--success`, gastos `--danger`) + linha da diferença (`--info`). No mobile, rolagem horizontal com os 6 meses mais recentes visíveis inicialmente.
- Tooltips com valores exatos em BRL; gridlines discretas (`--border`); eixos em `--text-secondary`.
- Botão "Ver como tabela" em cada gráfico (tabela acessível com os mesmos valores).
- Formas além da cor: sinal `+`/`−` e ícones `TrendingUp`/`TrendingDown` nos valores.

### 8.5 Estados

Toda tela com dados tem: skeleton (loading), vazio com CTA ("Nenhum gasto em outubro. Registrar o primeiro?"), erro com "Tentar de novo". Se uma requisição passar de 3s, aparece o aviso discreto "Acordando o servidor…".

### 8.6 PWA

- Serwist: `manifest.webmanifest` (nome "Cash Tracker", `display: standalone`, `background_color`/`theme_color` `#0B0F0E`, ícones 192/512 + maskable) e service worker com cache só de assets estáticos (sem cache de `/api`).
- Ícones Apple (`apple-touch-icon`) e meta tags para iOS.
- `/ajustes` mostra "Instalar app":
  - Chrome/Edge/Android: usa o evento `beforeinstallprompt`;
  - iOS Safari: instruções "Compartilhar → Adicionar à Tela de Início";
  - já instalado (`display-mode: standalone`): o item fica oculto.

### 8.7 Formatação

`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`; datas com `Intl.DateTimeFormat('pt-BR')`; nomes de mês em português ("outubro de 2026").

---

## 9. Design system aplicado

Fontes de verdade: `design-system-verdant.md` (base) e `design-system-medicalsports-locomotive.md` (camada editorial).

### 9.1 Tokens (CSS variables + Tailwind theme)

Os tokens do Verdant §15 são adotados integralmente, mais:

```css
:root {
  /* Medical Sports × Locomotive */
  --radius-pill: 100px;
  --ease-editorial: cubic-bezier(0.16, 1, 0.3, 1);
  --text-display: clamp(2.5rem, 9vw, 5rem);   /* telas de auth e saldo de destaque */
  --page-gutter: clamp(1rem, 4vw, 3rem);
}
```

### 9.2 Regras de fusão

| Ponto | Regra |
|---|---|
| Tema | Somente escuro (`color-scheme: dark`) |
| Cores | Verdant. Verde = entradas/ações/positivo; `#F87171` = saídas/negativo. O acento editorial `#D83018` **não** é usado |
| Fontes | Inter (UI) + JetBrains Mono (valores, `font-variant-numeric: tabular-nums`), via `@fontsource` |
| Display | `--text-display` + eyebrow em caixa alta (`text-xs`, `letter-spacing: .12em`, `--text-secondary`) nas telas de auth e no saldo da Visão geral |
| Raio | Pílula no FAB "+" e no "Entrar com Google"; 8px nos demais botões e inputs; 12px em cards; 16px em painéis |
| Motion | `--ease-editorial` com durações `--motion-*` (140–300ms); reveal curto (opacidade + 8px) em cards ao carregar; nada de scrollytelling; `prefers-reduced-motion` desativa transições |
| Ícones | Lucide React apenas |
| Glass | Apenas no bottom sheet/dialog overlay e tooltips de gráfico |

### 9.3 Acessibilidade

Contraste AA em todos os textos; foco visível (anel `--primary` 2px + offset); labels associados; áreas de toque ≥ 44px; navegação por teclado completa; `aria-live` para toasts; tabelas alternativas aos gráficos.

---

## 10. Segurança

- `@fastify/helmet` na API.
- Headers no Next.js:
  - CSP: `default-src 'self'`; scripts com nonce; `img-src 'self' https://lh3.googleusercontent.com data:` para os avatares do Google;
  - `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima.
- Segredos somente em variáveis de ambiente; `.env.example` documentado; `.gitignore` bloqueia `.env*` e `*.pem`.
- O `client_secret` do Google e a chave privada JWT existem **apenas** no Render.
- Comparações de tokens em tempo constante; tokens armazenados somente como hash.
- Banco: usuário Postgres da aplicação com permissões apenas no schema da aplicação; a API do Supabase (PostgREST) **não** é usada. As tabelas ficam no schema `app`, que o PostgREST não expõe.

---

## 11. Dependências — política "zero vulnerabilidades"

- Node 24 LTS fixado em `.nvmrc`, `engines` e na imagem Docker.
- pnpm 10 fixado via `packageManager`; `save-exact=true`; `minimumReleaseAge: 10080` (7 dias) no `pnpm-workspace.yaml`.
- `pnpm-lock.yaml` commitado; CI usa `pnpm install --frozen-lockfile`.
- CI falha se `pnpm audit` reportar **qualquer** vulnerabilidade (qualquer severidade).
- Dependabot semanal para npm, GitHub Actions e Docker.
- Compatibilidade verificada: `pnpm install` sem avisos de peer dependency não resolvida; build, typecheck e testes verdes.
- Preferir APIs nativas a dependências (ex.: `fetch`, `crypto.randomBytes`, `crypto.subtle`).

---

## 12. Testes

| Camada | Ferramenta | Cobertura mínima |
|---|---|---|
| Unitário (shared/api) | Vitest | Conversão centavos ↔ BRL, parsing de mês, PKCE (`code_challenge` conhecido do RFC 7636), decisão de vinculação de contas (§6.5), rotação/reuso de refresh (§6.2) |
| Integração (api) | Vitest + `app.inject()` + Postgres real (Docker local; service no CI) | Todas as rotas da §7, isolamento entre dois usuários (404), agregados com meses zerados, rate limit, `Origin` inválido → 403. Google simulado: servidor HTTP local fazendo papel de token endpoint e JWKS, com chaves geradas no teste |
| Componentes (web) | Vitest + Testing Library | Input de valor em R$, formulário de lançamento, telas de login, cadastro e redefinição |
| E2E | Playwright (projetos "iPhone 15" e "Desktop Chrome") | Cadastro → criar lançamento → ver no dashboard; esqueci a senha (e-mail capturado via `ConsoleEmailSender`/endpoint de teste); logout |

As funcionalidades são desenvolvidas com TDD.

---

## 13. Ambientes e deploy

### 13.1 Local

- `docker compose up -d` sobe o Postgres 17.
- `pnpm dev` sobe a web (`:3000`) e a API (`:4000`); o rewrite aponta `/api` para `http://localhost:4000`.
- `EMAIL_PROVIDER=console` imprime os e-mails no terminal.
- Redirect URI de dev: `http://localhost:3000/api/auth/google/callback`.

### 13.2 Variáveis de ambiente

**API (Render)**

| Variável | Exemplo / descrição |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | fornecida pelo Render |
| `APP_URL` | `https://<app>.vercel.app` |
| `DATABASE_URL` | string do pooler Supavisor (modo *session*, porta 5432) com `sslmode=require` |
| `JWT_PRIVATE_KEY` | PEM RSA em base64 |
| `JWT_KEY_ID` | ex.: `2026-10` |
| `COOKIE_SECRET` | 32+ bytes aleatórios |
| `GOOGLE_CLIENT_ID` | do GCP |
| `GOOGLE_CLIENT_SECRET` | do GCP |
| `GOOGLE_REDIRECT_URI` | `https://<app>.vercel.app/api/auth/google/callback` |
| `EMAIL_PROVIDER` | `brevo` (prod) / `console` (dev, teste) |
| `BREVO_API_KEY` | do Brevo |
| `EMAIL_FROM` | endereço verificado no Brevo |
| `EMAIL_FROM_NAME` | `Cash Tracker` |

A API valida todas as variáveis com Zod na inicialização e falha rápido se faltar alguma.

**Web (Vercel)**

| Variável | Descrição |
|---|---|
| `API_URL` | `https://<api>.onrender.com` (usada no rewrite, só no servidor) |

### 13.3 Produção

| Serviço | Configuração |
|---|---|
| Supabase | Projeto Free na região **us-east-1**; migrations aplicadas pela API |
| Render | Web Service, runtime Docker, região **Virginia**, Dockerfile `apps/api/Dockerfile`, contexto na raiz; health check `/health`; auto-deploy da `main`. O container executa `migrate` e depois `start` |
| Vercel | Projeto Hobby, root directory `apps/web`, framework Next.js, auto-deploy da `main` |
| Brevo | Conta Free, remetente verificado (e-mail do dono), chave de API |
| cron-job.org | GET `https://<app>.vercel.app/api/health` a cada 10 min |
| Google Cloud | Ver `docs/setup-google-oauth.md` |

Deploys de *preview* da Vercel não suportam login com Google (o Google não aceita redirect URIs curinga). O login por e-mail/senha funciona neles, desde que apontem para uma API acessível.

### 13.4 Dockerfile (API)

Multi-stage: `deps` (pnpm fetch com lockfile) → `build` (tsc dos pacotes `shared` e `api`) → `runtime` (`node:24-alpine`, só dependências de produção via `pnpm deploy --prod`, usuário `node`, `HEALTHCHECK`, `CMD ["node","dist/start.js"]`, em que `start.js` roda as migrations e sobe o servidor).

### 13.5 CI (GitHub Actions)

Em push e PR: `pnpm install --frozen-lockfile` → `pnpm audit` → lint (ESLint) → typecheck → testes unitários e de integração (service Postgres 17) → build web → `docker build` da API → E2E Playwright (contra o build local).

---

## 14. Documentação entregue

- `README.md`: visão geral, arquitetura, decisões, como rodar.
- `docs/setup-google-oauth.md`: configuração do Google Cloud.
- `docs/deploy.md`: passo a passo de Supabase, Render, Vercel, Brevo e cron-job.org (criado no plano de implementação).
- `.env.example` em `apps/api` e `apps/web`.

---

## 15. Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Cold start do Render (~50s) | Ping a cada 10 min + aviso "Acordando o servidor…" |
| E-mail de redefinição no spam (remetente sem domínio) | Aviso na tela; `EmailSender` permite migrar para Resend com domínio próprio |
| Supabase pausar por inatividade | `/health` faz `SELECT 1` a cada ping |
| Vercel Hobby é para uso não comercial | Adequado ao uso pessoal; reavaliar se virar produto |
| Rate limit em memória perde estado ao reiniciar | Aceitável com instância única |
| Vulnerabilidade nova publicada após a entrega | CI com audit + Dependabot semanal |
