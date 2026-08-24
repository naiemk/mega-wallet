FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core ./packages/core
COPY apps/worker ./apps/worker
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mega-wallet/core build && pnpm --filter @mega-wallet/worker build
ENV API_URL=http://mega-wallet-api:8080
CMD ["node", "apps/worker/dist/index.js"]
