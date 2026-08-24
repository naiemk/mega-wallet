#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/system-tests/.env"

TAG="${IMAGE_TAG:-main}"
PULL="${PULL:-0}"

export IMAGE_API="${IMAGE_API}:${TAG}"
export IMAGE_UI="${IMAGE_UI}:${TAG}"
export IMAGE_WORKER="${IMAGE_WORKER}:${TAG}"

if [ "$PULL" = "1" ]; then
  docker pull "$IMAGE_API"
  docker pull "$IMAGE_UI"
  docker pull "$IMAGE_WORKER"
fi

chmod +x "$ROOT/deploy/gen-dev-certs.sh" "$ROOT/deploy/smoke-test.sh"
"$ROOT/deploy/gen-dev-certs.sh"
docker compose -f "$ROOT/deploy/docker-compose.yml" --env-file "$ROOT/system-tests/.env" up -d
sleep 12
"$ROOT/deploy/smoke-test.sh"
bash "$ROOT/system-tests/tests/ui-load.sh"
docker compose -f "$ROOT/deploy/docker-compose.yml" down -v
echo "SYSTEM TEST OK"
