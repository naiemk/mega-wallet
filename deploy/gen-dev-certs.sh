#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$DIR/certs"
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$DIR/certs/key.pem" \
  -out "$DIR/certs/cert.pem" \
  -days 365 \
  -subj "/CN=localhost"
echo "Dev certs written to deploy/certs"
