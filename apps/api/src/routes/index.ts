import type { FastifyInstance } from "fastify";
import { registerAdminRoutes } from "./admin.js";
import { registerConversationRoutes } from "./conversations.js";
import { registerMatchRoutes } from "./matches.js";
import { registerOnboardingRoutes } from "./onboarding.js";
import { registerProfileRoutes } from "./profiles.js";
import { registerSafetyRoutes } from "./safety.js";
import { registerWaitlistRoutes } from "./waitlist.js";

export async function registerRoutes(app: FastifyInstance) {
  const rootPayload = {
    message: "Clarity.ai local MVP API is running.",
    endpoints: [
      "GET /health",
      "GET /api/health",
      "GET /api",
      "GET /api/profiles/:userId",
      "PUT /api/profiles/:userId",
      "POST /api/onboarding",
      "GET /api/matches?userId=:id",
      "GET /api/conversations?userId=:id",
      "GET /api/conversations/:conversationId/messages",
      "POST /api/conversations",
      "POST /api/messages",
      "POST /api/reports",
      "POST /api/waitlist/leads",
      "POST /api/admin/load-seeds"
    ]
  };

  app.get("/health", async () => ({
    status: "ok",
    app: "clarity-ai-api",
    stage: "mvp"
  }));

  app.get("/", async () => rootPayload);

  await registerWaitlistRoutes(app);
  await registerProfileRoutes(app);
  await registerOnboardingRoutes(app);
  await registerMatchRoutes(app);
  await registerConversationRoutes(app);
  await registerSafetyRoutes(app);
  await registerAdminRoutes(app);
}
