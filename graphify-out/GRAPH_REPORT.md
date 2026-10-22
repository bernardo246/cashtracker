# Graph Report - cash_tracker  (2026-10-21)

## Corpus Check
- 227 files · ~71,292 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .example 2, .css 1)

## Summary
- 1158 nodes · 2761 edges · 56 communities (51 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.83)
- Token cost: 367,539 input · 0 output

## Community Hubs (Navigation)
- Componentes UI e Formulário
- Telas de Autenticação
- Pacote Shared (Schemas)
- Migrações e Testes de API
- CI, Deploy e Docs
- Plano: Tarefas da API
- Dependências da API
- Banco e Schema Drizzle
- Lint e Raiz do Monorepo
- Erros HTTP da API
- Bootstrap e Config da API
- Envio de E-mail
- Testes de Formulários
- Navegação e Tooltip
- Config de Testes Web
- Dashboards por Categoria
- Scripts de Build e E2E
- Dependências da Web
- Gráfico Mensal
- Pacote Shared (Build)
- Lista de Lançamentos
- Cliente Google OAuth
- Config shadcn
- Guardas e Rate Limit
- Providers e Hidratação
- Cliente HTTP e Sessão
- JWT e Auth Guard
- Login Google e Vínculo
- Specs E2E
- Layout do App e Visão Geral
- TSConfig Web
- Scripts da Raiz
- DevDeps da Web
- Serviço de Autenticação
- Página de Ajustes
- Layout Raiz e Toaster
- TSConfig Base
- Testes do Formulário de Lançamento
- Redefinição de Senha
- Manifesto PWA e Proxy CSP
- Testes de Categorias
- TSConfig Shared
- TSConfig API
- Testes Diversos Web
- Prompt de Instalação PWA
- Testes da Lista
- Testes do Cliente HTTP
- TSConfig Build API
- TSConfig Build Shared
- Next Config e Rewrites
- Ícones do PWA
- Testes da Visão Geral
- Service Worker
- Estratégia de Testes
- PostCSS
- Spec e Plano

## God Nodes (most connected - your core abstractions)
1. `cn()` - 85 edges
2. `react` - 51 edges
3. `useSession()` - 37 edges
4. `Button()` - 29 edges
5. `buildApp()` - 26 edges
6. `next` - 24 edges
7. `@testing-library/react` - 23 edges
8. `validate()` - 20 edges
9. `fastify` - 19 edges
10. `CategoryReportView()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `CI test job (audit, lint, typecheck, tests)` --semantically_similar_to--> `docker-compose Postgres 17 service`  [INFERRED] [semantically similar]
  .github/workflows/ci.yml → docker-compose.yml
- `cron-job.org keep-alive job` --semantically_similar_to--> `Keep-alive ping (cron-job.org -> /api/health)`  [INFERRED] [semantically similar]
  docs/deploy.md → README.md
- `Dependabot config` --conceptually_related_to--> `pnpm workspace config`  [INFERRED]
  .github/dependabot.yml → pnpm-workspace.yaml
- `CI test job (audit, lint, typecheck, tests)` --shares_data_with--> `pnpm workspace config`  [INFERRED]
  .github/workflows/ci.yml → pnpm-workspace.yaml
- `Supabase Session pooler DATABASE_URL` --conceptually_related_to--> `Architecture: Vercel web + Render API + Supabase Postgres`  [INFERRED]
  docs/deploy.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication system (tokens, rotation, Google, email/password, reset, CSRF, rate limit)** — docs_superpowers_specs_2026_10_19_cash_tracker_design_token_strategy, docs_superpowers_specs_2026_10_19_cash_tracker_design_refresh_rotation, docs_superpowers_specs_2026_10_19_cash_tracker_design_google_oauth_flow, docs_superpowers_specs_2026_10_19_cash_tracker_design_account_linking, docs_superpowers_specs_2026_10_19_cash_tracker_design_email_password_auth, docs_superpowers_specs_2026_10_19_cash_tracker_design_password_reset, docs_superpowers_specs_2026_10_19_cash_tracker_design_csrf_origin, docs_superpowers_specs_2026_10_19_cash_tracker_design_rate_limiting [EXTRACTED 0.95]
- **API implementation tasks T3-T12** — docs_superpowers_plans_2026_10_19_cash_tracker_t03_api_skeleton, docs_superpowers_plans_2026_10_19_cash_tracker_t04_migrator, docs_superpowers_plans_2026_10_19_cash_tracker_t05_jwt_refresh, docs_superpowers_plans_2026_10_19_cash_tracker_t06_session_routes, docs_superpowers_plans_2026_10_19_cash_tracker_t07_password_reset, docs_superpowers_plans_2026_10_19_cash_tracker_t08_google_login, docs_superpowers_plans_2026_10_19_cash_tracker_t09_categories, docs_superpowers_plans_2026_10_19_cash_tracker_t10_transactions, docs_superpowers_plans_2026_10_19_cash_tracker_t11_reports, docs_superpowers_plans_2026_10_19_cash_tracker_t12_docker [EXTRACTED 0.90]
- **Frontend implementation tasks T12-W to T19** — docs_superpowers_plans_2026_10_19_cash_tracker_t12w_web_skeleton, docs_superpowers_plans_2026_10_19_cash_tracker_t13_api_client, docs_superpowers_plans_2026_10_19_cash_tracker_t14_auth_screens, docs_superpowers_plans_2026_10_19_cash_tracker_t15_shell, docs_superpowers_plans_2026_10_19_cash_tracker_t16_transactions_screen, docs_superpowers_plans_2026_10_19_cash_tracker_t17_category_dashboards, docs_superpowers_plans_2026_10_19_cash_tracker_t18_overview, docs_superpowers_plans_2026_10_19_cash_tracker_t19_settings_pwa [EXTRACTED 0.90]
- **Zero-cost production deploy stack** — docs_deploy_vercel_web, docs_deploy_render_api, docs_deploy_supabase_session_pooler, docs_deploy_cron_keepalive, docs_deploy_brevo [EXTRACTED 1.00]
- **CI pipeline jobs** — _github_workflows_ci_test_job, _github_workflows_ci_build_job, _github_workflows_ci_e2e_job [EXTRACTED 1.00]
- **Cookie-first auth design (proxy, JWT, refresh, OAuth)** — readme_vercel_api_proxy, readme_jwt_refresh_strategy, readme_google_oauth_pkce_flow [EXTRACTED 1.00]
- **Cash Tracker app icon set** — apps_web_src_app_icon_svg, apps_web_public_icons_icon_512, apps_web_public_icons_icon_192, apps_web_public_icons_maskable_512, apps_web_public_icons_apple_touch_icon [INFERRED 0.95]

## Communities (56 total, 5 thin omitted)

### Community 0 - "Componentes UI e Formulário"
Cohesion: 0.06
Nodes (75): Card(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DialogContent(), DialogDescription(), DialogFooter() (+67 more)

### Community 1 - "Telas de Autenticação"
Cohesion: 0.10
Nodes (44): metadata, Page(), metadata, Page(), AuthLayout(), metadata, Page(), metadata (+36 more)

### Community 2 - "Pacote Shared (Schemas)"
Cohesion: 0.06
Nodes (48): CATEGORY_COLORS, CATEGORY_ICONS, CategoryIcon, DEFAULT_CATEGORIES, TransactionType, currentMonthSaoPaulo(), dayFmt, isMonthKey() (+40 more)

### Community 3 - "Migrações e Testes de API"
Cohesion: 0.08
Nodes (40): DEFAULT_DIR, runMigrations(), { sql, close }, begin(), callback(), Ctx, loginWithGoogle(), setup() (+32 more)

### Community 4 - "CI, Deploy e Docs"
Cohesion: 0.05
Nodes (47): Dependabot config, CI workflow, CI build job (web build, API Docker image), CI e2e job (Playwright), CI test job (audit, lint, typecheck, tests), Medical Sports x Locomotive design system, Accessibility, reduced motion and performance rules, Editorial accent color (#D83018) (+39 more)

### Community 5 - "Plano: Tarefas da API"
Cohesion: 0.07
Nodes (46): parseBrlToCents, Review focus (BRL parsing, email normalization, SP timezone, concurrent refresh, archived categories), Task 2: @cash/shared (money, dates, schemas), Task 3: API skeleton (env, buildApp, errors, health), Task 4: SQL schema and migrator with advisory lock, Task 5: JWT RS256, rotating refresh tokens, argon2, Task 6: register/login/refresh/logout/me, Origin guard, rate limit, Task 7: Password reset and Brevo/console email (+38 more)

### Community 6 - "Dependências da API"
Cohesion: 0.05
Nodes (41): dependencies, argon2, @cash/shared, drizzle-orm, fastify, @fastify/cookie, @fastify/helmet, @fastify/rate-limit (+33 more)

### Community 7 - "Banco e Schema Drizzle"
Cohesion: 0.10
Nodes (30): createDb(), Db, app, categories, oauthAccounts, refreshTokens, transactions, users (+22 more)

### Community 8 - "Lint e Raiz do Monorepo"
Cohesion: 0.07
Nodes (29): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, globals, @types/node, typescript, typescript-eslint (+21 more)

### Community 9 - "Erros HTTP da API"
Cohesion: 0.12
Nodes (18): badRequest(), notFound(), registerErrorHandler(), zodFields(), isUniqueViolation(), CategoryRow, createCategoryService(), getOwnedCategory() (+10 more)

### Community 10 - "Bootstrap e Config da API"
Cohesion: 0.14
Nodes (19): buildApp(), trustProxyFor(), startServer(), bool, Env, loadEnv(), schema, AUTHED_MAX_PER_MINUTE (+11 more)

### Community 11 - "Envio de E-mail"
Cohesion: 0.13
Nodes (18): AppDeps, createBrevoSender(), env, msg, createConsoleSender(), Logger, EmailMessage, EmailSender (+10 more)

### Community 12 - "Testes de Formulários"
Cohesion: 0.20
Nodes (14): TOKEN, nav, resetMocks(), sessionMock, sessionValue(), open, renderView(), logout (+6 more)

### Community 13 - "Navegação e Tooltip"
Cohesion: 0.17
Nodes (13): TooltipContent(), AppShell(), BottomNav(), Fab(), isActive(), NAV_ITEMS, NavItem, Sidebar() (+5 more)

### Community 14 - "Config de Testes Web"
Cohesion: 0.09
Nodes (20): @cash/shared, postgres, vitest, name, private, type, version, class-variance-authority (+12 more)

### Community 15 - "Dashboards por Categoria"
Cohesion: 0.17
Nodes (16): Page(), Page(), CategoryBarChart(), CategoryBarChartProps, renderChart(), CategoryReportView(), go(), selectMonth() (+8 more)

### Community 16 - "Scripts de Build e E2E"
Cohesion: 0.13
Nodes (13): admin, dbUrl, { privateKey }, BG, chunk(), FG, geometry(), inC() (+5 more)

### Community 17 - "Dependências da Web"
Cohesion: 0.10
Nodes (20): dependencies, @cash/shared, class-variance-authority, clsx, @fontsource/inter, @fontsource/jetbrains-mono, lucide-react, next (+12 more)

### Community 18 - "Gráfico Mensal"
Cohesion: 0.17
Nodes (11): ChartDatum, MonthlyItem, short, shortMonth(), toChartData(), AXIS, MonthlyChartCanvas(), monthName() (+3 more)

### Community 19 - "Pacote Shared (Build)"
Cohesion: 0.10
Nodes (19): dependencies, zod, devDependencies, vitest, exports, files, vitest, zod (+11 more)

### Community 20 - "Lista de Lançamentos"
Cohesion: 0.18
Nodes (15): Lancamentos(), Page(), TIPO, TIPO_PARAM, MonthPicker(), useTransactions(), dayFmt, DayGroup (+7 more)

### Community 21 - "Cliente Google OAuth"
Cohesion: 0.12
Nodes (13): createGoogleClient(), DEFAULT_GOOGLE_ENDPOINTS, GoogleAuthError, GoogleClient, GoogleEndpoints, GoogleEnv, GoogleProfile, DEFAULTS (+5 more)

### Community 22 - "Config shadcn"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 23 - "Guardas e Rate Limit"
Cohesion: 0.24
Nodes (12): AppError, createOriginGuard(), createWindowLimiter(), authRoutes(), bodyEmail(), Deps, loginKey(), AuthService (+4 more)

### Community 24 - "Providers e Hidratação"
Cohesion: 0.23
Nodes (11): HydrationMarker(), Providers(), WakingBanner(), makeQueryClient(), SessionProvider(), Probe(), setup(), Grab() (+3 more)

### Community 25 - "Cliente HTTP e Sessão"
Cohesion: 0.15
Nodes (9): ApiClient, ApiClientOptions, createApiClient(), parse(), refreshShared(), run(), send(), RequestOptions (+1 more)

### Community 26 - "JWT e Auth Guard"
Cohesion: 0.17
Nodes (11): now, { privateKey }, fastify, FastifyInstance, FastifyRequest, registerAuthGuard(), unauthorized(), createJwtService() (+3 more)

### Community 27 - "Login Google e Vínculo"
Cohesion: 0.24
Nodes (13): linkGoogleAccount(), cookieOptions(), Deps, googleRoutes(), OauthState, parseOauthState(), queryString(), sameSecret() (+5 more)

### Community 28 - "Specs E2E"
Cohesion: 0.30
Nodes (9): ROUTES, addExpense(), logIn(), logOut(), open(), PASSWORD, signUp(), uniqueEmail() (+1 more)

### Community 29 - "Layout do App e Visão Geral"
Cohesion: 0.29
Nodes (10): AppLayout(), Page(), Home(), Skeleton(), MonthlyChart(), MonthlyChartCanvas, OverviewView(), RecentTransactions() (+2 more)

### Community 30 - "TSConfig Web"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 31 - "Scripts da Raiz"
Cohesion: 0.14
Nodes (14): scripts, build, dev, e2e, icons, lint, prebuild, predev (+6 more)

### Community 32 - "DevDeps da Web"
Cohesion: 0.15
Nodes (13): devDependencies, jsdom, @playwright/test, postgres, serwist, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event (+5 more)

### Community 33 - "Serviço de Autenticação"
Cohesion: 0.36
Nodes (7): conflict(), createAuthService(), UserRow, hashPassword(), verifyDummy(), verifyPassword(), seedDefaultCategories()

### Community 34 - "Página de Ajustes"
Cohesion: 0.29
Nodes (8): Page(), Section(), Button(), ButtonProps, MonthPickerProps, Card(), InstallAppButton(), lucide-react

### Community 35 - "Layout Raiz e Toaster"
Cohesion: 0.21
Nodes (8): dynamic, metadata, RootLayout(), viewport, Toaster(), @fontsource/inter, @fontsource/jetbrains-mono, react-dom

### Community 36 - "TSConfig Base"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, isolatedModules, module, moduleResolution, noUncheckedIndexedAccess, resolveJsonModule, skipLibCheck (+3 more)

### Community 37 - "Testes do Formulário de Lançamento"
Cohesion: 0.20
Nodes (3): EXPENSES, INCOMES, toastSuccess

### Community 38 - "Redefinição de Senha"
Cohesion: 0.31
Nodes (6): passwordResetTokens, escapeHtml(), resetPasswordEmail(), createPasswordResetService(), Deps, PasswordResetService

### Community 39 - "Manifesto PWA e Proxy CSP"
Cohesion: 0.33
Nodes (4): manifest(), config, proxy(), next

### Community 41 - "TSConfig Shared"
Cohesion: 0.22
Nodes (8): compilerOptions, declaration, outDir, rootDir, types, extends, include, ../../tsconfig.base.json

### Community 42 - "TSConfig API"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, ../../tsconfig.base.json

### Community 44 - "Prompt de Instalação PWA"
Cohesion: 0.36
Nodes (6): BeforeInstallPromptEvent, detectEnv(), Env, InstallPlatform, subscribeEnv(), useInstallPrompt()

### Community 46 - "Testes do Cliente HTTP"
Cohesion: 0.29
Nodes (4): apiError(), Handler, json(), user

### Community 47 - "TSConfig Build API"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 48 - "TSConfig Build Shared"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 49 - "Next Config e Rewrites"
Cohesion: 0.40
Nodes (4): buildRewrites(), nextConfig, withSerwist, @serwist/next

### Community 50 - "Ícones do PWA"
Cohesion: 0.47
Nodes (6): Apple touch icon, PWA icon 192x192, PWA icon 512x512, PWA maskable icon 512x512 (padded safe zone), App icon SVG (green C on dark background), Cash Tracker brand identity: green (#3ECF8E) C monogram on near-black (#0B0F0E)

### Community 51 - "Testes da Visão Geral"
Cohesion: 0.33
Nodes (3): monthly, open, renderView()

### Community 52 - "Service Worker"
Cohesion: 0.50
Nodes (4): sameOrigin(), serwist, WorkerGlobalScope, serwist

### Community 53 - "Estratégia de Testes"
Cohesion: 0.50
Nodes (4): Global constraints (pinned versions, banned packages, cents, schema app), Task 1: Monorepo, toolchain, base CI, Task 20: Playwright E2E and full CI, Testing strategy (Vitest, app.inject with real Postgres, Playwright)

## Knowledge Gaps
- **40 isolated node(s):** `@cash/shared`, `postgres`, `zod`, `tsx`, `vitest` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 442 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Layout do App e Visão Geral` to `Componentes UI e Formulário`, `Telas de Autenticação`, `Página de Ajustes`, `Layout Raiz e Toaster`, `Testes do Formulário de Lançamento`, `Testes de Categorias`, `Prompt de Instalação PWA`, `Navegação e Tooltip`, `Config de Testes Web`, `Dashboards por Categoria`, `Gráfico Mensal`, `Lista de Lançamentos`, `Providers e Hidratação`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `@cash/shared`, `postgres`, `zod` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Componentes UI e Formulário` be split into smaller, more focused modules?**
  _Cohesion score 0.05656565656565657 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Componentes UI e Formulário` to `Telas de Autenticação`, `Página de Ajustes`, `Navegação e Tooltip`, `Gráfico Mensal`, `Lista de Lançamentos`, `Layout do App e Visão Geral`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Telas de Autenticação` be split into smaller, more focused modules?**
  _Cohesion score 0.10221619176843058 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `DevDeps da Web` to `Config de Testes Web`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Pacote Shared (Schemas)` be split into smaller, more focused modules?**
  _Cohesion score 0.0576271186440678 - nodes in this community are weakly interconnected._