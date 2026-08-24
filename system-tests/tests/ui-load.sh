#!/usr/bin/env bash
set -euo pipefail
COMPOSE=(docker compose -f deploy/docker-compose.yml)
"${COMPOSE[@]}" exec -T nginx wget -qO- --no-check-certificate https://127.0.0.1/ | grep -q "Mega Wallet"
echo "UI load OK"
