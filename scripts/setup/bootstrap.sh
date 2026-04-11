#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

mkdir -p data/runtime

if [ ! -f data/runtime/local-db.json ]; then
  cp data/fixtures/runtime-store-template.json data/runtime/local-db.json
fi

npm install
npm --workspace packages/shared run build
npm run seed
