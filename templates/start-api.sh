#!/usr/bin/env bash
# Mega Wallet API — env-file based start (vibed-infra product override).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
# shellcheck source=lib-env.sh
[[ -f lib-env.sh ]] && source lib-env.sh && load_dotenv .env

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

IMAGE="${BACKEND_IMAGE:-ghcr.io/naiemk/mega-wallet-api:main}"
NAME="${DOCKER_NAME:-mega-wallet-api}"
HOST_PORT="${HOST_PORT:-}"
DATA_DIR="${DATA_DIR:-./data}"
NETWORK="${DOCKER_NETWORK:-mega-wallet-edge}"
MEMORY="${API_MEMORY_LIMIT:-512m}"

if [[ ! -f .env ]]; then
  echo "Missing .env — run install-api.sh and edit .env from .env.api.example" >&2
  exit 1
fi

if [[ "${PULL:-1}" == "1" && "$IMAGE" != *:local ]]; then
  echo "Pulling $IMAGE ..."
  docker pull "$IMAGE"
fi

docker network create "$NETWORK" >/dev/null 2>&1 || true
chown_data_dir "$DATA_DIR" 1000
DATA_ABS="$(cd "$DATA_DIR" && pwd)"

if docker inspect "$NAME" >/dev/null 2>&1; then
  echo "Removing existing container $NAME ..."
  docker rm -f "$NAME" >/dev/null
fi

PORT_ARGS=()
if [[ -n "$HOST_PORT" && "$HOST_PORT" != "0" ]]; then
  PORT_ARGS=(-p "${HOST_PORT}:8080")
fi

echo "Starting $NAME (network $NETWORK) ..."
# shellcheck disable=SC2046
docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  --network "$NETWORK" \
  $(memory_args "$MEMORY") \
  "${PORT_ARGS[@]}" \
  --env-file .env \
  -v "${DATA_ABS}:/data" \
  "$IMAGE" >/dev/null

if [[ ${#PORT_ARGS[@]} -gt 0 ]]; then
  echo "API: http://localhost:${HOST_PORT}/api/health"
else
  echo "API reachable on $NETWORK as $NAME:8080 (no host port published)"
fi
