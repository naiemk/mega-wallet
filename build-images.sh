#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
docker build -f "$ROOT/app/api/Dockerfile" -t mega-wallet-api:local "$ROOT"
docker build -f "$ROOT/app/ui/Dockerfile" -t mega-wallet-ui:local "$ROOT"
docker build -f "$ROOT/app/worker/Dockerfile" -t mega-wallet-worker:local "$ROOT"
echo "Built mega-wallet-api:local mega-wallet-ui:local mega-wallet-worker:local"
