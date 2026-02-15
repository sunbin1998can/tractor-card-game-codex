FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY web/package.json web/pnpm-lock.yaml ./web/
COPY server/package.json server/pnpm-lock.yaml ./server/
RUN cd web && pnpm install --frozen-lockfile
RUN cd server && pnpm install --frozen-lockfile
COPY web ./web
COPY server ./server
RUN cd web && pnpm build
RUN cd server && pnpm build

FROM node:20-slim AS runtime
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=builder /app/server/package.json /app/server/pnpm-lock.yaml ./server/
RUN cd server && pnpm install --prod --frozen-lockfile
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/web/dist ./web/dist
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
