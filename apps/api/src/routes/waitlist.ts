import type { FastifyInstance } from "fastify";
import { CreateWaitlistLeadInputSchema } from "@clarity/shared";
import { createId, nowIso } from "../lib/ids.js";
import { readStore, writeStore } from "../lib/store.js";

export async function registerWaitlistRoutes(app: FastifyInstance) {
  app.post("/waitlist/leads", async (request, reply) => {
    const parsed = CreateWaitlistLeadInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid waitlist payload.",
        details: parsed.error.flatten()
      });
    }

    const store = await readStore();
    const lead = {
      id: createId("lead"),
      createdAt: nowIso(),
      ...parsed.data
    };

    store.waitlistLeads.unshift(lead);
    await writeStore(store);

    return reply.code(201).send({ lead });
  });
}
