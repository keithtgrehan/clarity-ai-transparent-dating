# Deploy

> **Historical packaging notes only. Deployment is not authorized.** The current API has no authentication or participant-safe storage, CORS is permissive when unconfigured, and the destructive seed route is not privileged. Use only synthetic local data. Production work is blocked by Gate G5 in `docs/control_room/RELEASE_GATES.md`.

## Historical Replit packaging setup
1. Import the GitHub repo into Replit from the `replit-ui-polish` branch or from `main` after merge.
2. Set the Replit root to the repository root.
3. Run the install/setup command once:
   `npm run setup`

## Commands
- Install command: `npm install`
- Setup command: `npm run setup`
- Dev command: `npm run dev`
- Build command: `npm run build`
- Production start command: `APP_ENV=production SERVE_WEB=true PORT=$PORT npm run start`

## How the monorepo runs
- `npm run dev` starts shared package watch, the Fastify API, and the Vite web app.
- `npm run build` builds shared contracts first, then the API bundle, then the Vite web bundle.
- `npm run start` runs the built Fastify server from `apps/api/dist/server.js`.

## Port and host notes
- The API binds to `0.0.0.0`.
- In production, the server respects `PORT` first, then falls back to `API_PORT`.
- The built React app is served by Fastify on the same port as the API.
- Browser routes such as `/matches` and `/chat` resolve to the SPA in production.
- API routes live under `/api`.
- Health checks are available at `/health` and `/api/health`.

## Environment variables
- Required for normal local dev:
  - `APP_ENV=local`
  - `API_PORT=4000`
  - `WEB_PORT=5173`
  - `VITE_API_BASE_URL=http://localhost:4000/api`
- Historical single-process packaging values (not approved for deployment):
  - `APP_ENV=production`
  - `SERVE_WEB=true`
  - `PORT=$PORT`
- Runtime store:
  - `API_STORAGE_FILE=../../data/runtime/local-db.json`

## Deployment notes
- Replit should use the production start command so the app and API share one port.
- Do not deploy Vite dev mode as the production entrypoint.
- If you change shared contracts, rebuild before restarting production.
- If a stale local process holds onto `4000` or another port, stop the listener and restart. The known local watch caveat is limited to development mode.
