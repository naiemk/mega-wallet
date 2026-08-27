# Mega Wallet

USD-only mobile wallet with modular on/off-ramps. Users see only USD; crypto and fiat rails live behind adapter ports.

## Stack

- **API** — Hono + Better Auth (passkeys + email) + SQLite/Drizzle
- **UI** — Vite + React 19, mobile-first, RTL (en/fa/ar)
- **Worker** — polls Trustless Commerce deposit status
- **Deploy** — [vibed-infra](https://github.com/naiemk/vibed-infra) VPS packaging + GHCR images

## Branding

Edit [`branding.yaml`](branding.yaml) at the repo root (name, subtitle, domain, logo paths, i18n). The UI loads it at build/dev time — no code changes needed for a rebrand beyond assets under `apps/ui/public/brand/`.


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

Regenerate and commit `dist/` after template changes:

```bash
./package.sh
git add dist && git commit
```

Operators install with wget (each profile in its own directory under e.g. `/home/mws/testnet/`):

```bash
export PRODUCT_RAW=https://raw.githubusercontent.com/naiemk/mega-wallet/main/dist

INSTALL_DIR=/home/mws/testnet/api  bash <(wget -qO- "$PRODUCT_RAW/install-api.sh")
INSTALL_DIR=/home/mws/testnet/ui   bash <(wget -qO- "$PRODUCT_RAW/install-ui.sh")
INSTALL_DIR=/home/mws/testnet/nodes bash <(wget -qO- "$PRODUCT_RAW/install-nodes.sh")
```

Edit each `.env` (especially `BETTER_AUTH_*`, `PUBLIC_*_URL`, `INTERNAL_WORKER_TOKEN`), then start:

```bash
cd /home/mws/testnet/api && ./start-api.sh
cd /home/mws/testnet/ui && ./start-ui.sh
cd /home/mws/testnet/nodes && ./start-nodes.sh
```

**HTTPS:** If port 443 is already taken (e.g. Trustless Commerce gateway), skip `install-gateway.sh` and proxy `pool.trustless-commerce.com` from the existing nginx to `mega-wallet-api:8080` and `mega-wallet-ui:80` on `mega-wallet-edge` (connect the nginx container to that network). Gateway config for a standalone host is in `dist/install-gateway.sh`.

**GHCR:** `docker login ghcr.io` with a read token before `./start-*.sh` pulls images.


## CI

- **CI** — unit tests, UI build, `dist/` drift check
- **Docker images** — build/push GHCR on every PR, compose smoke
- **System tests** — nightly + post-merge against `:main` images
