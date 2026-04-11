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
    app: "project-a-z-api",
    stage: "foundation"
  }));

  app.get("/", async () => ({
    message: "Project A-Z API foundation is running.",
    endpoints: [
      "POST /waitlist/leads",
      "GET /profiles/:userId",
      "PUT /profiles/:userId",
      "POST /onboarding/submit",
      "GET /matches/candidates?userId=:id",
      "GET /conversations?userId=:id",
      "GET /conversations/:conversationId/messages",
      "POST /conversations",
      "POST /messages",
      "POST /safety/report-block",
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
