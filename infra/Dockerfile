FROM docker.m.daocloud.io/library/node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/storefront/package.json apps/storefront/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/design-system/package.json packages/design-system/package.json
COPY packages/i18n/package.json packages/i18n/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG APP=@buyhksim/api
RUN pnpm --filter ${APP} build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
ARG START_COMMAND="pnpm --filter @buyhksim/api start"
ENV START_COMMAND=${START_COMMAND}
CMD ["sh", "-c", "$START_COMMAND"]
