FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ui ./apps/ui
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/ui
RUN pnpm build

FROM nginx:alpine
COPY app/ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/ui/dist /usr/share/nginx/html
EXPOSE 80
