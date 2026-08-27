#!/usr/bin/env bash
set -euo pipefail
COMPOSE=(docker compose -f deploy/docker-compose.yml)
html="$("${COMPOSE[@]}" exec -T nginx wget -qO- --no-check-certificate https://127.0.0.1/)"
echo "$html" | grep -qE "Mega Wallet|مگا ولت|ميغا وولت"
echo "UI load OK"
