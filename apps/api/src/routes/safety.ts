import type { FastifyInstance } from "fastify";
import { CreateReportBlockInputSchema } from "@project-a-z/shared";
import { createId, nowIso } from "../lib/ids.js";
import { readStore, writeStore } from "../lib/store.js";

export async function registerSafetyRoutes(app: FastifyInstance) {
  app.post("/safety/report-block", async (request, reply) => {
    const parsed = CreateReportBlockInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid report payload.",
        details: parsed.error.flatten()
      });
    }

    const store = await readStore();
    const report = {
      id: createId("report"),
      createdAt: nowIso(),
      status: "submitted" as const,
      ...parsed.data
    };

    store.reports.unshift(report);

    store.conversations = store.conversations.map((conversation) => {
      if (
        parsed.data.blockUser &&
        conversation.participantUserIds.includes(parsed.data.reporterUserId) &&
        conversation.participantUserIds.includes(parsed.data.targetUserId)
      ) {
        return {
          ...conversation,
          status: "blocked" as const,
          updatedAt: nowIso()
        };
      }

      return conversation;
    });

    await writeStore(store);

    return reply.code(201).send({ report });
  });
}
