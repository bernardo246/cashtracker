# Guia de deploy e publicação

Passo a passo para publicar o Cash Tracker **a custo zero**: Supabase (Postgres), Brevo (e-mail), Render (API em Docker), Vercel (web), Google Cloud (login) e cron-job.org (keep-alive). Segue a spec §13.

Faça na ordem abaixo. Há uma dependência circular entre Render e Vercel (cada um precisa da URL do outro); o guia resolve isso criando a API primeiro com valores provisórios, que são corrigidos no passo 5.

Ao longo do texto, `<app>` é o domínio da Vercel (ex.: `cashtracker.vercel.app`) e `<api>` é o domínio do Render (ex.: `cashtracker-api.onrender.com`).

---

## 1. Supabase (banco)

1. Crie uma conta em https://supabase.com e um **projeto Free**, na região **us-east-1** (a mesma área do Render em Virginia). Defina e **guarde a senha do banco**.
2. Clique em **Connect** → aba **Session pooler** e copie a URI (porta **5432**). Substitua `[YOUR-PASSWORD]` pela senha e acrescente `?sslmode=require`:

   ```
   postgres://postgres.<ref>:<SENHA>@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   Use o **Session pooler**: a conexão direta do Supabase é só IPv6 e o Render não tem saída IPv6. Esse valor será o `DATABASE_URL`.
3. Não é preciso criar tabelas: a API aplica as migrations sozinha ao iniciar (cria o schema `app`).

> Projetos Free **pausam após 7 dias sem atividade**. O ping do passo 7 (que dispara um `SELECT 1`) evita isso.

### Opcional (recomendado): role com privilégio mínimo

Em vez de usar o usuário `postgres` (dono de tudo) na API, crie um role restrito ao schema `app`. Rode no **SQL Editor** do Supabase, trocando a senha:

```sql
CREATE ROLE cash_app WITH LOGIN PASSWORD 'TROQUE_POR_UMA_SENHA_FORTE';
GRANT USAGE, CREATE ON SCHEMA app TO cash_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO cash_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO cash_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cash_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT USAGE, SELECT ON SEQUENCES TO cash_app;
```

Fluxo recomendado:

1. Faça o **primeiro deploy com a URI do `postgres`** (dono): as migrations criam o schema `app` e as tabelas.
2. Rode o SQL acima no SQL Editor (o schema já existe).
3. No Render, troque o `DATABASE_URL` para o usuário `cash_app` (no pooler o usuário é `cash_app.<ref>`, com a mesma senha definida no `CREATE ROLE`). O migrator só cria o schema se ele não existir, então não exige `CREATE` no banco.

As tabelas criadas pelo `postgres` continuam dele; os `GRANT ... ON ALL TABLES` cobrem as existentes. Migrations futuras que criem tabelas, se executadas como `cash_app`, geram tabelas dele; se quiser que as futuras tabelas criadas pelo `postgres` também sejam acessíveis, rode `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cash_app;`. Se preferir simplicidade, pule esta seção.

---

## 2. Brevo (e-mail de redefinição de senha)

1. Crie uma conta Free em https://www.brevo.com (300 e-mails/dia).
2. Em **Senders, Domains & Dedicated IPs → Senders**, adicione o e-mail remetente (um e-mail seu; **não precisa de domínio**) e **confirme** pelo link enviado. Esse e-mail será o `EMAIL_FROM`.
3. Em **SMTP & API → API Keys**, gere uma chave. Será o `BREVO_API_KEY`.

> Sem domínio próprio, os e-mails podem cair no **spam**. A interface já avisa o usuário disso. O Render Free bloqueia SMTP de saída; por isso o envio usa a API HTTP do Brevo.

---

## 3. Chaves JWT

Localmente, com Node 24:

```bash
pnpm install
pnpm --filter @cash/api keys:generate
```

O comando imprime `JWT_PRIVATE_KEY` (PEM em base64) e `JWT_KEY_ID`. Copie para o Render (passo 4). **Nunca commite** esses valores nem os coloque em arquivos versionados.

Gere também o `COOKIE_SECRET` (32+ caracteres aleatórios):

```bash
openssl rand -base64 48
```

---

## 4. Render (API)

1. Crie uma conta em https://render.com e conecte o GitHub.
2. **New → Web Service** → selecione o repositório `bernardo246/cashtracker`, branch `main`.
3. Configure:

   | Campo | Valor |
   |---|---|
   | Runtime | **Docker** |
   | Dockerfile Path | `apps/api/Dockerfile` |
   | Docker Build Context Directory | `.` (raiz do repositório) |
   | Region | **Virginia (US East)** |
   | Instance Type | **Free** |
   | Health Check Path | `/health` |
   | Auto-Deploy | Yes (a cada push na `main`) |

4. Em **Environment**, cadastre as variáveis:

   | Variável | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | fornecida pelo Render (não cadastre) |
   | `APP_URL` | `https://<app>` (URL da Vercel; provisória até o passo 5) |
   | `DATABASE_URL` | URI do Session pooler com `?sslmode=require` (passo 1) |
   | `JWT_PRIVATE_KEY` | do `keys:generate` (passo 3) |
   | `JWT_KEY_ID` | do `keys:generate` |
   | `COOKIE_SECRET` | `openssl rand -base64 48` |
   | `GOOGLE_CLIENT_ID` | do Google Cloud (passo 6) |
   | `GOOGLE_CLIENT_SECRET` | do Google Cloud (passo 6) |
   | `GOOGLE_REDIRECT_URI` | `https://<app>/api/auth/google/callback` |
   | `EMAIL_PROVIDER` | `brevo` |
   | `BREVO_API_KEY` | do Brevo (passo 2) |
   | `EMAIL_FROM` | remetente verificado no Brevo |
   | `EMAIL_FROM_NAME` | `Cash Tracker` |
   | `LOG_LEVEL` | `info` |
   | `RATE_LIMIT_ENABLED` | `true` |
   | `TRUST_PROXY_HOPS` | `2` (edge da Vercel + load balancer do Render) |

   - `EMAIL_PROVIDER=console` só imprime no log (desenvolvimento) e `memory` é exclusivo de testes: a API **recusa `memory` fora de `NODE_ENV=test`**.
   - A API valida tudo com Zod ao iniciar e **falha rápido** se faltar algo; veja os logs do deploy.
   - Como a Vercel ainda não existe, o Google (passo 6) e `APP_URL`/`GOOGLE_REDIRECT_URI` serão completados depois. Comece com valores provisórios e corrija no passo 5; o Render redeploya ao salvar.

5. **Create Web Service.** As migrations rodam sozinhas ao iniciar o container (`node dist/start.js`). Anote a URL `https://<api>.onrender.com` e confira `https://<api>.onrender.com/health`.

> Instâncias Free **dormem após 15 min** sem tráfego (acordar leva ~50 s). O ping do passo 7 mitiga isso.

---

## 5. Vercel (web)

1. Crie uma conta em https://vercel.com (Hobby) e conecte o GitHub.
2. **Add New → Project** → importe o repositório.
3. Configure:

   | Campo | Valor |
   |---|---|
   | Framework Preset | Next.js |
   | Root Directory | `apps/web` |
   | Include source files outside of the Root Directory in the Build Step | **ligado** (o monorepo depende de `packages/shared`) |
   | Build Command | padrão do projeto (`pnpm build` → `next build --webpack`; o Serwist/PWA exige webpack) |

   O monorepo pnpm é detectado automaticamente pelo `pnpm-lock.yaml`.
4. Em **Environment Variables**, adicione `API_URL=https://<api>.onrender.com`. É usada só no servidor (rewrites de `/api/*`) e o **build falha sem ela**.
5. **Deploy** e anote a URL de produção (`https://<app>`).
6. Volte ao Render e ajuste `APP_URL=https://<app>` e `GOOGLE_REDIRECT_URI=https://<app>/api/auth/google/callback`.

> **Preview deployments** da Vercel não suportam login com Google (o Google não aceita redirect URIs curinga). E-mail e senha funcionam neles.

---

## 6. Google Cloud (login com Google)

Siga [`setup-google-oauth.md`](setup-google-oauth.md) usando `<app>` do passo 5. Cadastre o redirect `https://<app>/api/auth/google/callback`, copie Client ID e Secret para o Render (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) e **publique o app** na tela de consentimento.

---

## 7. cron-job.org (keep-alive)

1. Crie uma conta em https://cron-job.org.
2. Novo cron job: URL `https://<app>/api/health`, método **GET**, a cada **10 minutos**.

O `/health` faz `SELECT 1` no banco; assim o ping mantém o Render acordado e o Supabase ativo.

---

## 8. Checklist pós-deploy

- [ ] `curl https://<app>/api/health` responde 200.
- [ ] No celular: cadastro, login, criar lançamentos e ver os dashboards.
- [ ] "Esqueceu a sua senha?" recebe o e-mail (confira também o spam).
- [ ] Login com Google funciona.
- [ ] Instalar o PWA no Android (botão "Instalar app") e no iPhone (Compartilhar → Adicionar à Tela de Início).
- [ ] Os logs do Render não mostram erros de configuração; o job no cron-job.org aparece como bem-sucedido.

---

## Segurança: URL pública do Render

A URL `*.onrender.com` é acessível publicamente. Quem a chamar direto contorna o proxy da Vercel e, com isso, os limites de taxa **por IP** de cadastro e refresh podem ser contornados (o login tem também um limite por e-mail). Endurecer isso (por exemplo, exigir um segredo compartilhado entre a Vercel e a API) está **fora do escopo** da v1.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Build da Vercel falha | `API_URL` não definida, ou a opção de incluir arquivos fora do Root Directory desligada |
| API não sobe no Render | Variável faltando ou inválida (veja o log); `DATABASE_URL` sem `?sslmode=require` ou da conexão direta em vez do Session pooler |
| Primeira requisição demora ~50 s | Instância Free dormindo; confira o job do cron-job.org |
| `redirect_uri_mismatch` | `GOOGLE_REDIRECT_URI` diferente da cadastrada no Google, ou teste em preview |
| Limite de taxa pega todos como um IP só | `TRUST_PROXY_HOPS` incorreto (deve ser `2` em produção) |
