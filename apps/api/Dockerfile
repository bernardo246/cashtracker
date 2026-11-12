# Build com contexto na raiz do repositório:
#   docker build -f apps/api/Dockerfile -t cash-api .
FROM node:26-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.7 --activate
WORKDIR /repo

# 1) deps: baixa dependências só com o lockfile (cache de camada estável)
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

# 2) build: instala offline, compila shared + api e gera o pacote de produção
FROM deps AS build
COPY package.json .npmrc tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm install --offline --frozen-lockfile \
  && pnpm --filter @cash/shared build \
  && pnpm --filter @cash/api build \
  && pnpm --filter @cash/api deploy --legacy --prod /out \
  && cp -r apps/api/dist /out/dist

# 3) runtime: só dependências de produção, usuário não-root
FROM node:26-alpine AS runtime
ENV NODE_ENV=production
# Aplica patches do Alpine e remove npm/corepack (não usados em runtime; trazem CVEs próprias)
RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" >/dev/null || exit 1
CMD ["node", "dist/start.js"]
