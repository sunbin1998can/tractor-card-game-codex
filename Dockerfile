FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/engine/package.json ./packages/engine/
COPY packages/protocol/package.json ./packages/protocol/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages ./packages
RUN pnpm -r build

FROM node:20-slim AS runtime
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/engine/package.json ./packages/engine/
COPY packages/protocol/package.json ./packages/protocol/
COPY packages/server/package.json ./packages/server/
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/packages/engine/dist ./packages/engine/dist
COPY --from=builder /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/web/dist ./packages/web/dist
EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
