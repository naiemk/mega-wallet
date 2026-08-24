#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
COMPOSE=(docker compose -f "$ROOT/docker-compose.yml")

echo "== health =="
"${COMPOSE[@]}" exec -T nginx wget -qO- --no-check-certificate https://127.0.0.1/api/health | grep -qE '"ok"\s*:\s*true'

echo "== ready =="
"${COMPOSE[@]}" exec -T nginx wget -qO- --no-check-certificate https://127.0.0.1/api/ready | grep -qE '"ok"\s*:\s*true'

echo "== quotes (public) =="
"${COMPOSE[@]}" exec -T api node -e "
fetch('http://127.0.0.1:8080/api/quotes?sourceCurrency=EUR&destCurrency=IRR&amount=100')
  .then(async r => { const t = await r.text(); if(!r.ok) throw new Error(t); console.log('quotes ok'); })
  .catch(e => { console.error(e); process.exit(1); })
"

echo "SMOKE OK"
