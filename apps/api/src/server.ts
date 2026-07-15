import { buildApp } from "./app.js";
import {
  readSignalEngineSettings,
  resolveApiListenHostForSignalReview
} from "./services/signal/settings.js";

async function start() {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  const host = resolveApiListenHostForSignalReview(readSignalEngineSettings());

  try {
    await app.listen({ port, host });
    app.log.info(`Clarity.ai API listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
