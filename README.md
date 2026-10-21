# Cash Tracker

Aplicação web (PWA, mobile-first) para registrar **entradas e saídas de dinheiro** por categoria e acompanhar a vida financeira em dashboards.

> **Status:** v1 implementada (web, API, testes e CI). Falta apenas publicar; veja o guia de deploy.
> Documentos:
> - Especificação: [`docs/superpowers/specs/2026-10-19-cash-tracker-design.md`](docs/superpowers/specs/2026-10-19-cash-tracker-design.md)
> - Guia de deploy: [`docs/deploy.md`](docs/deploy.md)
> - Configuração do Google OAuth: [`docs/setup-google-oauth.md`](docs/setup-google-oauth.md)
> - Plano de implementação: [`docs/superpowers/plans/2026-10-19-cash-tracker.md`](docs/superpowers/plans/2026-10-19-cash-tracker.md)

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Arquitetura](#arquitetura)
3. [Como rodar localmente](#como-rodar-localmente)
4. [Stack](#stack)
5. [Decisões técnicas](#decisões-técnicas)
6. [Modelo de dados](#modelo-de-dados)
7. [Autenticação](#autenticação)
8. [Design system](#design-system)
9. [Deploy e custo zero](#deploy-e-custo-zero)
10. [Estrutura do repositório](#estrutura-do-repositório)
11. [Fora do escopo da v1](#fora-do-escopo-da-v1)

---

## Funcionalidades

**v1**

- Cadastro e login com **e-mail + senha** ou **conta Google** (OAuth 2.0 + PKCE). Mesma conta quando o e-mail coincide.
- **"Esqueceu a sua senha?"**: link de redefinição por e-mail, uso único, expira em 30 min.
- Lançamentos de **entrada** e **saída**: valor (R$), categoria, data e descrição opcional. Listar, editar e excluir.
- **Categorias**: cada usuário começa com um conjunto padrão e pode criar, renomear e arquivar as suas. Categorias são separadas por tipo (entrada/saída).
- **Dashboards**
  - **Gastos por categoria**: gráfico de barras (uma barra por categoria) do mês selecionado, com navegação ‹ › entre meses e atalho "Ano todo".
  - **Entradas por categoria**: mesmo formato, para as entradas.
  - **Visão geral**: soma dos ganhos, soma dos gastos e a diferença **por mês**, nos últimos 12 meses.
- **PWA instalável** no celular e no computador, sem loja de apps:
  - Android / desktop (Chrome, Edge): botão "Instalar app".
  - iPhone (Safari): dica guiando "Compartilhar → Adicionar à Tela de Início".
- Interface **somente tema escuro**, responsiva com prioridade para mobile.

---

## Arquitetura

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

- **Frontend** (Next.js) hospedado na **Vercel**.
- **Backend** (Fastify, TypeScript) em container **Docker** no **Render**.
- **Banco** Postgres no **Supabase**, usado apenas como banco (sem Supabase Auth, sem RLS). Somente a API acessa o banco.
- O navegador fala **apenas com o domínio da Vercel**. Um *rewrite* do Next.js encaminha `/api/*` para o Render. Assim todos os cookies são de primeira parte (ver [decisões](#decisões-técnicas)).

---

## Como rodar localmente

**Pré-requisitos:** Node 24 (use `fnm use` ou `nvm use`, que leem o `.nvmrc`), pnpm 10.34.7 via `corepack enable` e Docker.

```bash
docker compose up -d                      # Postgres 17 em localhost:5432
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm install
pnpm --filter @cash/api keys:generate     # cole JWT_PRIVATE_KEY e JWT_KEY_ID em apps/api/.env
pnpm dev                                  # web em :3000 e API em :4000
```

- Em `apps/api/.env`, `DATABASE_URL=postgres://cash:cash@localhost:5432/cash` para o `pnpm dev`. `host.docker.internal` só vale se você rodar o container da API localmente.
- Com `EMAIL_PROVIDER=console` os e-mails são impressos no terminal da API.
- Login com Google local: veja [`docs/setup-google-oauth.md`](docs/setup-google-oauth.md) (redirect `http://localhost:3000/api/auth/google/callback`).

| Comando | O que faz |
|---|---|
| `pnpm test` | Testes unitários e de integração (precisa do Postgres do Docker) |
| `pnpm e2e` | E2E Playwright (iPhone e desktop), web em `:3100`, API em `:4100`, banco `cash_e2e` |
| `pnpm lint` / `pnpm typecheck` | ESLint e TypeScript |
| `pnpm audit:ci` | `pnpm audit` (deve dar 0 vulnerabilidades) |
| `pnpm build` | Build de todos os pacotes |

---

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (Radix), Lucide React, Recharts (apenas no gráfico mensal da visão geral), TanStack Query, Serwist (PWA) |
| Fontes | Inter + JetBrains Mono via `@fontsource` (self-hosted) |
| Backend | Node.js 24, Fastify, TypeScript |
| Banco / ORM | PostgreSQL (Supabase), Drizzle ORM + driver `postgres`, migrations em SQL puro (sem `drizzle-kit`, que traz dependência vulnerável) |
| Lint | ESLint + `typescript-eslint` + `eslint-plugin-react-hooks` (sem `eslint-config-next`, que traz dependência vulnerável) |
| Validação | Zod, com schemas compartilhados entre front e back (`packages/shared`) |
| Auth | `jose` (JWT RS256 e verificação do ID Token do Google via JWKS), `argon2` (hash de senha) |
| E-mail | Brevo (API HTTP via `fetch` nativo) |
| Qualidade | `pnpm audit` na CI (GitHub Actions) bloqueando merge + Dependabot/Renovate |

As versões exatas estão no [plano de implementação](docs/superpowers/plans/2026-10-19-cash-tracker.md#global-constraints), verificadas com **zero vulnerabilidades** e sem conflitos de peer dependencies (TypeScript fixado em 6.0, porque o `typescript-eslint` ainda não suporta o 7).

---

## Decisões técnicas

| # | Decisão | Motivo | Alternativas descartadas |
|---|---|---|---|
| 1 | **Proxy `/api/*` pela Vercel** (rewrite) em vez de chamar o Render direto | Front e API ficam no mesmo domínio, então o cookie do refresh token é de primeira parte. O Safari/iOS (ITP) bloqueia cookies de terceiros, o que quebraria o login no celular | Cookie `SameSite=None` cross-domain (quebra no Safari); tokens em `localStorage` (vulnerável a XSS) |
| 2 | **Access token JWT RS256 (15 min) em memória + refresh token opaco (30 dias) em cookie `httpOnly; Secure; SameSite=Lax; Path=/api/auth`** | O access token não persiste no navegador; o refresh token não fica acessível a JavaScript | JWT longo sem refresh; sessão em `localStorage` |
| 3 | **Refresh token rotativo com detecção de reuso** | Cada uso gera um novo token. Se um token antigo reaparecer, a família inteira é revogada (sinal de roubo) | Refresh token fixo |
| 4 | **Fluxo OAuth feito no backend**, sem `passport` ou NextAuth | Os 10 passos (state, PKCE, troca do code, verificação do ID Token) ficam explícitos e auditáveis | NextAuth/Auth.js (auth no front); Supabase Auth |
| 5 | **Node + TypeScript no backend** | Mesma linguagem do front, tipos e validações compartilhados, um único ecossistema de dependências para auditar | Python/FastAPI; Java/Spring |
| 6 | **Fastify** em vez de NestJS | Menos dependências (facilita "0 vulnerabilidades") e cold start menor no Render | NestJS |
| 7 | **Drizzle ORM** | Leve, migrations em SQL puro, sem binário de engine | Prisma |
| 8 | **Conexão via pooler do Supabase (Supavisor)** | A conexão direta do Supabase é só IPv6; o Render não tem saída IPv6 | Conexão direta |
| 9 | **Brevo** para e-mail de redefinição de senha | Custo zero sem domínio próprio (verifica só o endereço remetente), 300 e-mails/dia, API HTTP | **Resend**: exige domínio verificado, e `*.vercel.app` não pode ser verificado. **Gmail SMTP**: o Render free bloqueia portas SMTP (25/465/587) |
| 10 | **Envio de e-mail atrás de uma interface `EmailSender`** | Trocar Brevo por Resend no futuro (ao comprar um domínio) é só configuração | — |
| 11 | **Dinheiro em centavos inteiros** (`bigint`) | Sem erros de arredondamento de ponto flutuante | `float`/`numeric` em reais |
| 12 | **Data do lançamento como `date`** (sem fuso) | O mês do lançamento é exatamente o que o usuário escolheu, sem deslocamentos de UTC | `timestamptz` |
| 13 | **Somente BRL** | Escopo da v1 | Multi-moeda |
| 14 | **Categorias arquivadas, não excluídas**, quando têm lançamentos | Preserva o histórico dos gráficos de meses passados | Exclusão em cascata |
| 15 | **Isolamento por `user_id` do JWT em toda consulta** | Um usuário nunca acessa dados de outro | RLS do Supabase (desnecessário, pois só a API acessa o banco) |
| 16 | **Ping de keep-alive gratuito** (cron-job.org → `https://<app>.vercel.app/api/health` a cada 10 min; o `/health` faz `SELECT 1`, mantendo também o Supabase ativo) | O Render free dorme após 15 min, e acordar leva ~50s. As 750 h/mês grátis cobrem 1 serviço 24/7 | Aceitar o cold start |
| 17 | **PWA** em vez de app nativo | Instalável sem App Store/Play Store e sem custo | React Native / lojas |
| 18 | **Somente tema escuro** | Segue o Verdant (dark-first); um tema só reduz estados a testar | Claro + escuro |
| 19 | **Build do web com `next build --webpack`** | O plugin Serwist (service worker do PWA) exige webpack; o dev usa Turbopack | Build com Turbopack |
| 20 | **Dashboards por categoria com barras em HTML**; Recharts só no gráfico mensal | Menos JavaScript e acessibilidade mais simples | Recharts em todos |
| 21 | **CSP com `style-src 'unsafe-inline'`** e `upgrade-insecure-requests` só em HTTPS | Estilos inline do Next/Radix/Recharts; o upgrade quebraria o E2E e o dev em HTTP | CSP com nonce de estilo |
| 22 | **`TRUST_PROXY_HOPS=2` em produção** | IP real do cliente atrás do edge da Vercel e do load balancer do Render | Confiar em qualquer `X-Forwarded-For` |

---

## Modelo de dados

| Tabela | Campos principais | Observações |
|---|---|---|
| `users` | `id` (uuid), `email` (único, case-insensitive), `name`, `avatar_url`, `password_hash` (nulo se só Google), `email_verified` | |
| `oauth_accounts` | `user_id`, `provider` (`google`), `provider_user_id` (`sub` do Google) | Único por (provider, sub). Vincula o Google ao usuário |
| `refresh_tokens` | `user_id`, `family_id`, `token_hash` (SHA-256), `expires_at`, `revoked_at`, `replaced_by` | Só o hash é salvo |
| `password_reset_tokens` | `user_id`, `token_hash`, `expires_at` (30 min), `used_at` | Uso único |
| `categories` | `user_id`, `name`, `type` (`income`/`expense`), `icon` (nome Lucide), `color`, `archived_at` | Única por (usuário, tipo, nome) |
| `transactions` | `user_id`, `category_id`, `type`, `amount_cents` (> 0), `occurred_on` (`date`), `description` | Índice em (`user_id`, `occurred_on`) |

**Categorias padrão** (criadas no primeiro login):

- **Saída:** Delivery, Combustível, Mercado, Moradia, Transporte, Saúde, Lazer, Assinaturas, Outros.
- **Entrada:** Salário, Freelance, Investimentos, Presente, Outros.

---

## Autenticação

### Login com Google (OAuth 2.0 + PKCE, executado pelo backend)

1. Usuário clica **"Entrar com Google"** no Next.js.
2. Browser → `GET /api/auth/google` (proxy da Vercel → API).
3. A API gera `state` + `code_verifier`/`code_challenge` (PKCE S256), guarda ambos num cookie assinado de 5 min e redireciona para o Google.
4. O usuário escolhe a conta e consente (escopos `openid email profile`).
5. O Google redireciona para `https://<app>.vercel.app/api/auth/google/callback?code=...&state=...`.
6. A API valida o `state` e troca o `code` (+ `code_verifier`) por tokens.
7. A API **verifica o ID Token**: assinatura (JWKS do Google), `iss`, `aud` (= client ID), `exp`, `email_verified`.
8. A API cria ou encontra o usuário no banco (por `sub` do Google; senão, por e-mail verificado → vincula).
9. A API emite o **JWT RS256** (access) + **refresh token** (cookie `httpOnly`).
10. Redireciona para o frontend, já logado.

### E-mail e senha

- Senhas com **argon2id**.
- **Esqueceu a senha:** o usuário informa o e-mail. A API responde sempre a mesma mensagem (não revela se o e-mail existe) e, se existir, envia via Brevo um link com token aleatório (hash no banco, 30 min, uso único). Ao redefinir, todas as sessões do usuário são revogadas.

> Vinculação de contas, rotação de refresh token, CSRF e rate limiting: ver a spec (§6). Configuração do Google Cloud: [`docs/setup-google-oauth.md`](docs/setup-google-oauth.md).

---

## Design system

O visual combina dois documentos da raiz do repositório:

- [`design-system-verdant.md`](design-system-verdant.md): **base** do app (dark-first, verde esmeralda, foco em dados financeiros).
- [`design-system-medicalsports-locomotive.md`](design-system-medicalsports-locomotive.md): **camada editorial** complementar.

| Ponto | Origem | Aplicação |
|---|---|---|
| Cores, superfícies, semântica | Verdant | Verde `#3ECF8E` = entradas/ações; vermelho `#F87171` = saídas. Sem o acento vermelho editorial como cor de marca |
| Fontes | Verdant | Inter (interface) + JetBrains Mono (valores, números tabulares) |
| Tipografia display (`clamp()`), eyebrow em caixa alta | Medical Sports × Locomotive | Telas de login/cadastro/reset e números de destaque dos dashboards |
| CTA em pílula (`radius 100px`) | Medical Sports | Botão "Novo lançamento" (FAB no mobile) e "Entrar com Google". Demais botões com raio de 8px (Verdant) |
| Motion | Ambos | Easing `cubic-bezier(0.16, 1, 0.3, 1)` + durações 140–300 ms; respeita `prefers-reduced-motion`; sem scrollytelling |
| Componentes | Verdant | Tailwind, shadcn/ui (Radix), Lucide; Recharts só no gráfico mensal (os dashboards por categoria usam barras em HTML) |
| Navegação | Adaptação | Sidebar no desktop; **barra inferior** no mobile (Visão geral · Lançamentos · Gastos · Entradas · Ajustes) + FAB "+" |

---

## Deploy e custo zero

| Serviço | Uso | Plano | Limitações conhecidas |
|---|---|---|---|
| Vercel | Frontend + proxy `/api/*` | Hobby (grátis) | Uso não comercial |
| Render | API em Docker | Free | Dorme após 15 min sem tráfego (mitigado com ping); 750 h/mês |
| Supabase | Postgres | Free | Projeto pausa após 7 dias sem atividade (o ping na API mantém atividade); 500 MB |
| Brevo | E-mail de redefinição de senha | Free | 300 e-mails/dia; remetente sem domínio próprio pode cair no spam |
| Google Cloud | OAuth 2.0 | Grátis | Escopos básicos (`openid email profile`) não exigem verificação do app |
| cron-job.org | Keep-alive | Grátis | — |

Passo a passo completo em [`docs/deploy.md`](docs/deploy.md).

---

## Estrutura do repositório

Estrutura:

```
cash_tracker/
├── apps/
│   ├── web/              # Next.js → Vercel (root directory: apps/web)
│   └── api/              # Fastify + Dockerfile → Render
├── packages/
│   └── shared/           # Schemas Zod e tipos compartilhados
├── docs/
│   ├── deploy.md         # Guia de deploy
│   ├── setup-google-oauth.md
│   └── superpowers/
│       ├── specs/        # Especificação de design
│       └── plans/        # Plano de implementação
├── design-system-verdant.md
├── design-system-medicalsports-locomotive.md
└── README.md
```

---

## Fora do escopo da v1

- Lançamentos recorrentes.
- Exportação CSV.
- Contas, investimentos e transferências (áreas do Verdant).
- Multi-moeda.
- Tema claro.
- Uso offline do PWA.
