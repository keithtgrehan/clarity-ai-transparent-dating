import type { FastifyInstance } from "fastify";
import {
  ConversationListResponseSchema,
  CreateConversationInputSchema,
  SendMessageInputSchema
} from "@project-a-z/shared";
import { createId, nowIso } from "../lib/ids.js";
import { readStore, writeStore } from "../lib/store.js";
import { analyzeMessageForModeration } from "../services/moderation.js";

export async function registerConversationRoutes(app: FastifyInstance) {
  app.get("/conversations", async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({ error: "userId query parameter is required." });
    }

    const store = await readStore();
    const conversations = store.conversations
      .filter((conversation) => conversation.participantUserIds.includes(userId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return ConversationListResponseSchema.parse({
      userId,
      conversations
    });
  });

  app.get("/conversations/:conversationId/messages", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const store = await readStore();
    const conversation = store.conversations.find((entry) => entry.id === conversationId);

    if (!conversation) {
      return reply.code(404).send({ error: "Conversation not found." });
    }

    return {
      conversation,
      messages: store.messages
        .filter((entry) => entry.conversationId === conversationId)
        .sort((left, right) => left.sentAt.localeCompare(right.sentAt))
    };
  });

  app.post("/conversations", async (request, reply) => {
    const parsed = CreateConversationInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid conversation payload.",
        details: parsed.error.flatten()
      });
    }

    const store = await readStore();
    const [leftUserId, rightUserId] = parsed.data.participantUserIds;

    const existing = store.conversations.find((conversation) => {
      const participants = new Set(conversation.participantUserIds);
      return participants.has(leftUserId) && participants.has(rightUserId);
    });

    if (existing) {
      return { conversation: existing, reused: true };
    }

    const conversation = {
      id: createId("conv"),
      participantUserIds: parsed.data.participantUserIds,
      status: "active" as const,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessagePreview: ""
    };

    store.conversations.unshift(conversation);
    await writeStore(store);

    return reply.code(201).send({ conversation, reused: false });
  });

  app.post("/messages", async (request, reply) => {
    const parsed = SendMessageInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid message payload.",
        details: parsed.error.flatten()
      });
    }

    const store = await readStore();
    const conversation = store.conversations.find(
      (entry) => entry.id === parsed.data.conversationId
    );

    if (!conversation) {
      return reply.code(404).send({ error: "Conversation not found." });
    }

    const message = {
      id: createId("msg"),
      conversationId: parsed.data.conversationId,
      senderUserId: parsed.data.senderUserId,
      body: parsed.data.body,
      sentAt: nowIso(),
      moderationState: "clear" as const
    };

    const moderation = analyzeMessageForModeration(message);
    const nextMessage = {
      ...message,
      moderationState: moderation.moderationState
    };

    conversation.updatedAt = nextMessage.sentAt;
    conversation.lastMessagePreview = nextMessage.body.slice(0, 180);

    store.messages.push(nextMessage);
    store.moderationFlags.push(...moderation.flags);

    await writeStore(store);

    return reply.code(201).send({
      message: nextMessage,
      moderationFlags: moderation.flags
    });
  });
}
