#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PACKAGER="$(node -e "console.log(require('path').dirname(require.resolve('vibed-infra/package.json')))")"
bash "$PACKAGER/package.sh" --product "$ROOT" --out "$ROOT/dist"

TPL="$ROOT/templates"
DIST="$ROOT/dist"
for f in start-api.sh docker-compose.workers.yml .env.api.example .env.nodes.example; do
  if [[ -f "$TPL/$f" ]]; then
    cp "$TPL/$f" "$DIST/$f"
    [[ "$f" == *.sh ]] && chmod +x "$DIST/$f"
  fi
done

# vibed-infra embeds absolute paths; normalize for committed dist/ drift checks.
CONFIG="$ROOT/dist/packageconfig.yaml"
if [[ -f "$CONFIG" ]]; then
  sed -i 's|^rawBase:.*|rawBase: .|' "$CONFIG"
  sed -i 's|^packagerRaw:.*|packagerRaw: "vibed-infra"|' "$CONFIG"
fi

echo "packaged: $ROOT/dist"
