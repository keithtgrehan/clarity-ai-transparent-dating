import type { FastifyInstance } from "fastify";
import { registerAdminRoutes } from "./admin.js";
import { registerConversationRoutes } from "./conversations.js";
import { registerMatchRoutes } from "./matches.js";
import { registerOnboardingRoutes } from "./onboarding.js";
import { registerProfileRoutes } from "./profiles.js";
import { registerSafetyRoutes } from "./safety.js";
import { registerWaitlistRoutes } from "./waitlist.js";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    app: "clarity-ai-api",
    stage: "mvp"
  }));

  app.get("/", async () => ({
    message: "Clarity.ai local MVP API is running.",
    endpoints: [
      "GET /health",
      "GET /profiles/:userId",
      "PUT /profiles/:userId",
      "POST /onboarding",
      "GET /matches?userId=:id",
      "GET /conversations?userId=:id",
      "GET /conversations/:conversationId/messages",
      "POST /conversations",
      "POST /messages",
      "POST /reports",
      "POST /waitlist/leads",
      "POST /admin/load-seeds"
    ]
  }));

  await registerWaitlistRoutes(app);
  await registerProfileRoutes(app);
  await registerOnboardingRoutes(app);
  await registerMatchRoutes(app);
  await registerConversationRoutes(app);
  await registerSafetyRoutes(app);
  await registerAdminRoutes(app);
}
