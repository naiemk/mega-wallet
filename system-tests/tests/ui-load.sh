#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/deploy/docker-compose.yml")
html="$("${COMPOSE[@]}" exec -T nginx wget -qO- --no-check-certificate https://127.0.0.1/)"
echo "$html" | grep -qE "Pool Begir|پول بگیر|بول بگير"
echo "UI load OK"
