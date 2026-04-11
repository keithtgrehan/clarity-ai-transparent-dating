import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ProfileResponseSchema, SubmitOnboardingInputSchema } from "@clarity/shared";
import { buildProfilePayload, buildStoredProfile } from "../lib/profiles.js";
import { readStore, writeStore } from "../lib/store.js";

export async function registerOnboardingRoutes(app: FastifyInstance) {
  const handler = async (
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) => {
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

    const existingProfile = store.profiles.find((entry) => entry.userId === parsed.data.userId);
    const profile = buildStoredProfile(user, parsed.data.profile, existingProfile);

    store.profiles = existingProfile
      ? store.profiles.map((entry) => (entry.userId === parsed.data.userId ? profile : entry))
      : [...store.profiles, profile];

    user.accountStatus = "active";
    user.updatedAt = profile.updatedAt;

    await writeStore(store);

    return ProfileResponseSchema.parse(buildProfilePayload(profile, Boolean(existingProfile)));
  };

  app.post("/onboarding", handler);
  app.post("/onboarding/submit", handler);
}
