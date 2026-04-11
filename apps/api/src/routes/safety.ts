import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CreateReportInputSchema } from "@clarity/shared";
import { createId, nowIso } from "../lib/ids.js";
import { readStore, writeStore } from "../lib/store.js";

export async function registerSafetyRoutes(app: FastifyInstance) {
  const handler = async (
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) => {
    const parsed = CreateReportInputSchema.safeParse(request.body);

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
    store.moderationFlags.unshift({
      id: createId("flag"),
      targetType: "user",
      targetId: parsed.data.targetUserId,
      category: parsed.data.categories[0],
      severity: parsed.data.blockUser ? "high" : "medium",
      status: "open",
      source: "user_report",
      evidenceSnippet: parsed.data.description.slice(0, 180),
      notes: "User submitted report from the local MVP flow.",
      createdAt: report.createdAt
    });

    if (parsed.data.blockUser) {
      store.conversations = store.conversations.map((conversation) => {
        if (
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
    }

    await writeStore(store);

    return reply.code(201).send({ report });
  };

  app.post("/reports", handler);
  app.post("/safety/report-block", handler);
}
