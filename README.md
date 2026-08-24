# Mega Wallet

USD-only mobile wallet with modular on/off-ramps. Users see only USD; crypto and fiat rails live behind adapter ports.

## Stack

- **API** — Hono + Better Auth (passkeys + email) + SQLite/Drizzle
- **UI** — Vite + React 19, mobile-first, RTL (en/fa/ar)
- **Worker** — polls Trustless Commerce deposit status
- **Deploy** — [vibed-infra](https://github.com/naiemk/vibed-infra) VPS packaging + GHCR images

## Local dev

```bash
pnpm install
cp .env.example .env
pnpm --filter @mega-wallet/core build
pnpm dev:api   # :8080
pnpm dev:ui    # :5173
pnpm dev:worker
```

With fake ramps (no Onramper/TC keys):

```bash
FAKE_RAMPS=1 pnpm dev:api
```

## Docker

```bash
./build-images.sh
./deploy/gen-dev-certs.sh
docker compose -f deploy/docker-compose.yml up -d
./deploy/smoke-test.sh
```

## Tests

```bash
pnpm test
pnpm test:coverage
pnpm test:e2e   # requires compose stack on :8088
```

## VPS (vibed-infra)

```bash
./package.sh
git add dist && git commit
# Operators wget dist/install-*.sh from your repo
```

## CI

- **CI** — unit tests, UI build, `dist/` drift check
- **Docker images** — build/push GHCR on every PR, compose smoke
- **System tests** — nightly + post-merge against `:main` images
