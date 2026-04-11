import type { FastifyInstance } from "fastify";
import { resetStoreFromSeeds, summarizeStoreCounts } from "../lib/seeds.js";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post("/admin/load-seeds", async (_request, reply) => {
    if (process.env.ALLOW_SEED_ENDPOINT === "false") {
      return reply.code(403).send({ error: "Seed endpoint is disabled." });
    }

    const seededStore = await resetStoreFromSeeds();

    return {
      ok: true,
      counts: summarizeStoreCounts(seededStore)
    };
  });
}
