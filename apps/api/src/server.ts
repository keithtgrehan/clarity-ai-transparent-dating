import { buildApp } from "./app.js";

async function start() {
  const app = await buildApp();
  const port = Number(process.env.API_PORT ?? 4000);
  const host = "0.0.0.0";

  try {
    await app.listen({ port, host });
    app.log.info(`Clarity.ai API listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
