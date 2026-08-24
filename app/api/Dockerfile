FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts ./
COPY packages/core ./packages/core
COPY apps/api ./apps/api
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mega-wallet/core build && pnpm --filter @mega-wallet/api build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
RUN mkdir -p /app/data
EXPOSE 8080
CMD ["node", "apps/api/dist/index.js"]
