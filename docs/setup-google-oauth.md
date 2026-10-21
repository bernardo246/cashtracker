# Configurando o login com Google (Google Cloud)

Guia para criar as credenciais OAuth 2.0 usadas pelo fluxo descrito na spec (§6.4). Tudo aqui é **gratuito**.

> **Pré-requisito:** saber a URL de produção do frontend na Vercel (ex.: `https://cashtracker.vercel.app`). Se ainda não tiver, faça primeiro o deploy inicial do front ou escolha o nome do projeto na Vercel. A URL pode ser adicionada depois, mas o login em produção só funciona quando ela estiver cadastrada.
>
> Ao longo do guia, troque `<APP>` pela sua URL de produção (ex.: `cashtracker.vercel.app`).

---

## 1. Criar o projeto no Google Cloud

1. Acesse https://console.cloud.google.com e entre com sua conta Google.
2. No seletor de projetos (barra superior), clique em **Novo projeto**.
3. Nome: `cash-tracker`. Organização: "Sem organização". Clique em **Criar**.
4. Confirme que o projeto `cash-tracker` está selecionado na barra superior.

Não é preciso ativar faturamento nem nenhuma API para o login com Google.

## 2. Configurar a tela de consentimento (Google Auth Platform)

1. No menu ☰, vá em **APIs e serviços → Tela de permissão OAuth** (ou acesse diretamente **Google Auth Platform**).
2. Clique em **Começar** e preencha:
   - **Informações do app:** nome `Cash Tracker`; e-mail de suporte = seu e-mail.
   - **Público-alvo:** **Externo** (permite qualquer conta Google).
   - **Dados de contato:** seu e-mail.
   - Aceite a política de dados do usuário e clique em **Criar**.
3. Em **Branding**:
   - **Não envie um logotipo por enquanto.** Enviar um logotipo obriga o app a passar por verificação da marca pelo Google, que pode levar dias. Sem logotipo, o app funciona normalmente.
   - Página inicial do app: `https://<APP>`.
   - Domínios autorizados: adicione `<APP>` (ex.: `cashtracker.vercel.app`).
   - Salve.
4. Em **Acesso a dados** → **Adicionar ou remover escopos**, marque apenas:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

   Esses são escopos **não sensíveis**: não exigem verificação do Google. Salve.

## 3. Criar o cliente OAuth (Client ID e Client Secret)

1. Em **Clientes** (ou **APIs e serviços → Credenciais**), clique em **Criar cliente**.
2. Tipo de aplicativo: **Aplicativo da Web**. Nome: `cash-tracker-web`.
3. **Origens JavaScript autorizadas** (o fluxo é feito no servidor, então isso não é obrigatório, mas ajuda a evitar confusão):
   - `http://localhost:3000`
   - `https://<APP>`
4. **URIs de redirecionamento autorizados** (precisam bater **exatamente**, incluindo `http`/`https`, porta e caminho, sem barra no final):
   - `http://localhost:3000/api/auth/google/callback`
   - `https://<APP>/api/auth/google/callback`
5. Clique em **Criar**.
6. **Copie o Client ID e o Client Secret agora** (ou baixe o JSON). O Google mostra o secret completo **apenas na criação**. Se perder, gere um novo secret no mesmo cliente.

> As URIs apontam para o domínio da **Vercel**, não do Render, porque o navegador acessa a API pelo proxy `/api/*` do Next.js (spec §3.1).

## 4. Colocar as credenciais nas variáveis de ambiente

As credenciais ficam **somente na API**. Nunca coloque o Client Secret na Vercel nem em variáveis `NEXT_PUBLIC_*`.

**Local**, em `apps/api/.env` (já ignorado pelo git):

```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
APP_URL=http://localhost:3000
```

**Produção:** no Render → seu Web Service → **Environment**:

| Chave | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | o mesmo Client ID |
| `GOOGLE_CLIENT_SECRET` | o mesmo Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://<APP>/api/auth/google/callback` |
| `APP_URL` | `https://<APP>` |

O mesmo cliente OAuth serve para dev e produção, pois ambas as URIs estão cadastradas.

Passo a passo completo do deploy (Render, Vercel, Supabase etc.): [`deploy.md`](deploy.md). No Render, defina também `TRUST_PROXY_HOPS=2`.

## 5. Modo de teste → produção

Um app novo começa em **Teste**: só as contas listadas em **Público-alvo → Usuários de teste** conseguem entrar (até 100).

1. **Durante o desenvolvimento:** em **Público-alvo**, adicione seu e-mail (e de quem for testar) como usuário de teste.
2. **Para liberar a qualquer conta Google:** em **Público-alvo**, clique em **Publicar app** → confirme. Como o app usa só escopos não sensíveis e não tem logotipo, ele vai para **Em produção** sem processo de verificação.

## 6. Testar

1. Rode o projeto localmente (`docker compose up -d` e `pnpm dev`).
2. Abra `http://localhost:3000/login` e clique em **Entrar com Google**.
3. Escolha a conta, consinta e confira se voltou para `/visao-geral` logado.
4. Repita em produção em `https://<APP>/login`.

## 7. Problemas comuns

| Erro | Causa provável | Solução |
|---|---|---|
| `redirect_uri_mismatch` | A URI enviada difere da cadastrada (http × https, barra final, porta, domínio de preview da Vercel) | Confira `GOOGLE_REDIRECT_URI` e a lista do passo 3.4. Deploys de **preview** da Vercel não funcionam com Google (sem curingas) |
| `Error 403: access_denied` / "app não verificado ou em teste" | App em modo Teste e a conta não é usuário de teste | Adicione a conta como usuário de teste ou publique o app (passo 5) |
| `invalid_client` | Client ID/Secret errados ou com espaços | Copie novamente; gere um novo secret se necessário |
| Volta para `/login?erro=google` | State expirado (mais de 5 min na tela do Google), cookie bloqueado ou ID Token rejeitado | Tente de novo; veja o log da API no Render pelo `requestId` |
| Loop de login no iPhone | Front acessando a API pelo domínio do Render em vez do `/api` da Vercel | Garanta que todas as chamadas usam o caminho relativo `/api/...` |

## 8. Segurança

- Se o Client Secret vazar (ex.: commit acidental), vá em **Clientes → cash-tracker-web**, adicione um novo secret, atualize o Render e **desative o antigo**.
- O fluxo usa PKCE (S256), `state` e `nonce`, e o ID Token é verificado (assinatura via JWKS, `iss`, `aud`, `exp`, `nonce`, `email_verified`). Detalhes na spec §6.4.
