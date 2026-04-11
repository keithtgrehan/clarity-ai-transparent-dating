import type { FastifyInstance } from "fastify";
import { UpsertProfileInputSchema } from "@project-a-z/shared";
import { nowIso } from "../lib/ids.js";
import { readStore, writeStore } from "../lib/store.js";

export async function registerProfileRoutes(app: FastifyInstance) {
  app.get("/profiles/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const store = await readStore();
    const profile = store.profiles.find((entry) => entry.userId === userId);

    if (!profile) {
      return reply.code(404).send({ error: "Profile not found." });
    }

    return { profile };
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

    if (parsed.data.userId !== userId) {
      return reply.code(400).send({ error: "Route userId and body userId must match." });
    }

    const store = await readStore();
    const user = store.users.find((entry) => entry.id === userId);

    if (!user) {
      return reply.code(404).send({ error: "User must exist before profile upsert." });
    }

    const nextProfile = {
      ...parsed.data,
      updatedAt: nowIso()
    };

    store.profiles = store.profiles.some((entry) => entry.userId === userId)
      ? store.profiles.map((entry) => (entry.userId === userId ? nextProfile : entry))
      : [...store.profiles, nextProfile];

    user.accountStatus = "active";
    user.updatedAt = nowIso();

    await writeStore(store);

    return { profile: nextProfile };
  });
}
