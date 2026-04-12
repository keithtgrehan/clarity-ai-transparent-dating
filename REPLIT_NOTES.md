# Replit Notes

- The production-safe entrypoint is `APP_ENV=production SERVE_WEB=true PORT=$PORT npm run start`.
- The React app and Fastify API intentionally share one port in production.
- API requests are namespaced under `/api`; frontend routes remain `/`, `/onboarding`, `/profile`, `/matches`, `/chat`, and `/safety`.
- For local development, keep `VITE_API_BASE_URL` pointed at `http://localhost:4000/api`.
- If Replit caches an older build, rerun `npm run build` before restarting the production server.
