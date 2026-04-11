import Fastify from "fastify";
import cors from "@fastify/cors";
import "./lib/env.js";
import { ensureStoreFile } from "./lib/store.js";
import { registerRoutes } from "./routes/index.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await ensureStoreFile();

  await app.register(cors, {
    origin: process.env.API_ALLOWED_ORIGIN ?? "http://localhost:5173"
  });

  await app.register(registerRoutes);

  return app;
}
