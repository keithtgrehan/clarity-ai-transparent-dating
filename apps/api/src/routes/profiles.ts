import type { FastifyInstance } from "fastify";
import { ProfileResponseSchema, UpsertProfileInputSchema } from "@clarity/shared";
import {
  buildProfilePayload,
  buildStoredProfile,
  createDefaultProfile
} from "../lib/profiles.js";
import { readStore, writeStore } from "../lib/store.js";

export async function registerProfileRoutes(app: FastifyInstance) {
  app.get("/profiles/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const store = await readStore();
    const user = store.users.find((entry) => entry.id === userId);

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    const existingProfile = store.profiles.find((entry) => entry.userId === userId);
    const profile = existingProfile ?? createDefaultProfile(user);

    return ProfileResponseSchema.parse(buildProfilePayload(profile, Boolean(existingProfile)));
  });

  app.put("/profiles/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = UpsertProfileInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid profile payload.",
        details: parsed.error.flatten()
      });
    }

    const store = await readStore();
    const user = store.users.find((entry) => entry.id === userId);

    if (!user) {
      return reply.code(404).send({ error: "User must exist before profile upsert." });
    }

    const existingProfile = store.profiles.find((entry) => entry.userId === userId);
    const nextProfile = buildStoredProfile(user, parsed.data, existingProfile);

    store.profiles = existingProfile
      ? store.profiles.map((entry) => (entry.userId === userId ? nextProfile : entry))
      : [...store.profiles, nextProfile];

    if (nextProfile.onboardingCompleted) {
      user.accountStatus = "active";
    }

    user.updatedAt = nextProfile.updatedAt;

    await writeStore(store);

    return ProfileResponseSchema.parse(buildProfilePayload(nextProfile, Boolean(existingProfile)));
  });
}
