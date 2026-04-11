import type { FastifyInstance } from "fastify";
import { SubmitOnboardingInputSchema } from "@project-a-z/shared";
import { nowIso } from "../lib/ids.js";
import { readStore, writeStore } from "../lib/store.js";

export async function registerOnboardingRoutes(app: FastifyInstance) {
  app.post("/onboarding/submit", async (request, reply) => {
    const parsed = SubmitOnboardingInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid onboarding payload.",
        details: parsed.error.flatten()
      });
    }

    const store = await readStore();
    const user = store.users.find((entry) => entry.id === parsed.data.userId);

    if (!user) {
      return reply.code(404).send({ error: "User not found for onboarding." });
    }

    const profile = {
      ...parsed.data.profile,
      updatedAt: nowIso()
    };

    store.profiles = store.profiles.some((entry) => entry.userId === parsed.data.userId)
      ? store.profiles.map((entry) => (entry.userId === parsed.data.userId ? profile : entry))
      : [...store.profiles, profile];

    user.accountStatus = "active";
    user.updatedAt = nowIso();

    await writeStore(store);

    return { ok: true, profile };
  });
}
