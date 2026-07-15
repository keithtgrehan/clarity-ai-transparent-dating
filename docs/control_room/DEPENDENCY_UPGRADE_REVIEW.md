# Dependency upgrade review

Reviewed: 2026-07-14. Scope: Phase 1 local MVP dependency remediation. Manifest ranges and lockfile-resolved versions were compared against baseline commit `aa6282f`.

| Dependency | Lockfile old → new | Reason and breaking-change review | Affected area | Required evidence |
|---|---|---|---|---|
| `fastify` | 5.8.4 → 5.10.0 | Resolves the known high advisory while staying on Fastify major 5. Current route/plugin APIs remain supported. | App construction, injection tests, every API route | API characterization tests, MVP verifier, API build/start |
| `@fastify/static` | 8.3.0 → 10.1.0 | Major upgrade required by the remediation set. Registration and `sendFile` behavior must be checked rather than inferred. | Built assets, `/`, SPA fallback, asset 404, API 404 separation | `npm run verify:static` after web build |
| `react-router-dom` | 6.30.3 → 6.30.4 | Patch upgrade; React 18 remains within the published peer range. No router API rewrite is included. | Browser routes and SPA fallback | Web typecheck/build plus static `/matches` fallback check |
| `vite` | 5.4.21 → 8.1.4 | Major jump. Vite 8 requires Node 20.19+ or 22.12+, replaces Rollup/esbuild bundling internals with Rolldown/Oxc, and updates default browser targets. The repository uses the supported Node 22.12+ range and has no custom Rollup/esbuild optimizer configuration. | Web development/build output and static assets | Clean install, web typecheck/build, built asset/static checks |
| `@vitejs/plugin-react` | 4.7.0 → 6.0.3 | Major jump paired with Vite 8. Version 6 removes Babel-specific options; this repository uses only `react()` and none of the removed Babel configuration. | JSX transform and web build | Web typecheck/build |
| `@fastify/cors` | 10.1.0 → 10.1.0 | No lockfile version change. Included in the compatibility review because Fastify moved and the current missing-origin default is an accepted security TODO, not a fixed control. | CORS registration/headers | Explicit configured allow/deny-origin injection check; SEC-005 remains open |

Official migration evidence: [Vite 8 announcement](https://vite.dev/blog/announcing-vite8), [Vite migration guide](https://vite.dev/guide/migration.html), [Vite 7 migration guide](https://v7.vite.dev/guide/migration), and the [official React plugin changelog](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md). Package metadata and the lockfile provide the exact installed versions and peer/engine ranges.

## Remaining advisory

`npm audit` reports one low-severity transitive `esbuild` advisory, `GHSA-g7r4-m6w7-qqqr`, affecting Windows development-server file reads. The installed `esbuild@0.27.7` is reached through the Vite, `tsx`, and `tsup` toolchain. The local work is macOS/Linux and CI is Ubuntu; the development server must not be exposed or treated as a participant service.

The concrete resolution path is to update or replace the constraining Vite/`tsx`/`tsup` toolchain as compatible releases remove the vulnerable range, then repeat clean install, build, static serving, MVP smoke, and audit. It must be resolved before Phase 5/closed beta and before any Windows or network-exposed development server is permitted. A zero-vulnerability claim is prohibited; the Phase 1 gate requires zero high-severity findings.
