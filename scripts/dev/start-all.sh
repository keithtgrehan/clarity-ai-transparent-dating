#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

cleanup() {
  kill 0
}

trap cleanup EXIT INT TERM

npm --workspace packages/shared run dev &
sleep 2
npm --workspace apps/api run dev &
npm --workspace apps/web run dev &

wait
