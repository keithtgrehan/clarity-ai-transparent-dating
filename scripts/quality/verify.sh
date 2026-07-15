#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

npm test
npm run typecheck
npm run build
npm run verify:static
npm run verify:mvp
npm run validate:resource-registry
npm run validate:claims
npm run check:restricted-artifacts -- --all-tracked
npm run check:no-raw-content
npm run check:public-copy
