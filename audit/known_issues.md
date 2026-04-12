# Known Issues

## Current Bugs And Rough Edges
- `tsx watch` can sometimes collide with port `4000` after shared-package edits and require a clean API restart.
- There is no browser E2E suite yet, so frontend regressions are still caught by manual verification plus TypeScript/build checks.
- The frontend dev server recreates `apps/web/node_modules/.vite` while running. It is only cache data, but it adds noise to the local workspace during dev.

## Current Product Limitations
- no auth or current-user session model
- one local seeded viewer account for review flows
- no realtime messaging
- no moderation review dashboard
- no deletion/export/privacy workflow implementation yet
- no pilot-calibrated matching weights yet

## Intentional Boundaries
- no diagnosis inference
- no mental-health severity inference
- no personality typing
- no manipulative engagement loops
- no payments
- no mobile app
