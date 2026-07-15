import { existsSync } from "node:fs";
import Fastify from "fastify";
import type { FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import "./lib/env.js";
import { resolveRepoPath } from "./lib/paths.js";
import { ensureStoreFile } from "./lib/store.js";
import { registerRoutes } from "./routes/index.js";
import {
  registerSignalAnalysisRoutes,
  type SignalFetch
} from "./routes/v2-signal-analysis.js";
import {
  registerT1UserDraftAnalysisRoutes,
  type T1UserDraftRouteOptions
} from "./routes/v2-user-draft-analysis.js";
import {
  readSignalEngineSettings,
  type SignalEngineSettings
} from "./services/signal/settings.js";

export type BuildAppOptions = {
  logger?: FastifyServerOptions["logger"];
  signalEngine?: SignalEngineSettings;
  signalFetch?: SignalFetch;
  t1UserDraft?: Omit<T1UserDraftRouteOptions, "settings" | "fetchImpl">;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true
  });
  const allowedOrigins = process.env.API_ALLOWED_ORIGIN
    ? process.env.API_ALLOWED_ORIGIN.split(",").map((origin) => origin.trim())
    : true;
  const shouldServeWeb =
    process.env.SERVE_WEB === "true" || process.env.APP_ENV === "production";
  const webDistPath = resolveRepoPath("apps/web/dist");
  const apiPrefixes = [
    "/health",
    "/api",
    "/api/v2",
    "/api/health",
    "/api/profiles",
    "/api/onboarding",
    "/api/matches",
    "/api/conversations",
    "/api/messages",
    "/api/reports",
    "/api/waitlist",
    "/api/admin"
  ];

  await ensureStoreFile();

  await app.register(cors, {
    origin: allowedOrigins
  });

  app.get("/health", async () => ({
    status: "ok",
    app: "clarity-ai-api",
    stage: "mvp"
  }));

  await app.register(registerRoutes, { prefix: "/api" });
  await app.register(registerSignalAnalysisRoutes, {
    prefix: "/api/v2",
    settings: options.signalEngine ?? readSignalEngineSettings(),
    fetchImpl: options.signalFetch
  });
  await app.register(registerT1UserDraftAnalysisRoutes, {
    prefix: "/api/v2",
    settings: options.signalEngine ?? readSignalEngineSettings(),
    fetchImpl: options.signalFetch,
    ...options.t1UserDraft
  });

  if (shouldServeWeb && existsSync(webDistPath)) {
    await app.register(fastifyStatic, {
      root: webDistPath
    });

    app.get("/", async (_request, reply) => reply.type("text/html").sendFile("index.html"));

    app.setNotFoundHandler((request, reply) => {
      const pathname = request.url.split("?")[0];
      const isApiRoute = apiPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      );
      const isSpaRoute = ["GET", "HEAD"].includes(request.method) && !pathname.includes(".");

      if (!isApiRoute && isSpaRoute) {
        return reply.type("text/html").sendFile("index.html");
      }

      return reply.status(404).send({ error: "Route not found." });
    });
  }

  return app;
}
