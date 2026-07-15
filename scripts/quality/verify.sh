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
npm run validate:signal-registries
npm run validate:training-source-registry
npm run validate:python-lock
npm run validate:claims
npm run check:restricted-artifacts -- --all-tracked
npm run check:no-raw-content
npm run check:signal-safety-language
npm run check:signal-domain-residue
npm run check:secrets
npm run check:public-copy
