import type { FastifyInstance } from "fastify";
import {
  ConversationListResponseSchema,
  ConversationMessagesResponseSchema,
  CreateConversationInputSchema,
  SendMessageInputSchema,
  type LocalDataStore,
  type Profile
} from "@clarity/shared";
import { createId, nowIso } from "../lib/ids.js";
import { readStore, writeStore } from "../lib/store.js";
import { analyzeMessageForModeration } from "../services/moderation.js";
import { calculateCompatibility } from "../services/matching.js";

type StoredConversation = LocalDataStore["conversations"][number];

function isBlockedPair(store: LocalDataStore, leftUserId: string, rightUserId: string) {
  return store.reports.some(
    (report) =>
      report.blockUser &&
      ((report.reporterUserId === leftUserId && report.targetUserId === rightUserId) ||
        (report.reporterUserId === rightUserId && report.targetUserId === leftUserId))
  );
}

function resolveDisplayName(store: LocalDataStore, userId: string) {
  return (
    store.profiles.find((profile) => profile.userId === userId)?.displayName ??
    store.users.find((user) => user.id === userId)?.firstName ??
    userId
  );
}

function buildConversationListItem(store: LocalDataStore, conversation: StoredConversation) {
  return {
    ...conversation,
    participants: conversation.participantUserIds.map((userId) => ({
      userId,
      displayName: resolveDisplayName(store, userId)
    }))
  };
}

function buildFirstMessagePrompt(currentProfile?: Profile, candidateProfile?: Profile) {
  if (!currentProfile || !candidateProfile) {
    return undefined;
  }

  if (!currentProfile.onboardingCompleted || !candidateProfile.onboardingCompleted) {
    return undefined;
  }

  return calculateCompatibility(currentProfile, candidateProfile).firstMessagePrompt;
}

export async function registerConversationRoutes(app: FastifyInstance) {
  app.get("/conversations", async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({ error: "userId query parameter is required." });
    }

    const store = await readStore();
    const conversations = store.conversations
      .filter((conversation) => conversation.participantUserIds.includes(userId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((conversation) => buildConversationListItem(store, conversation));

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

    const [leftUserId, rightUserId] = conversation.participantUserIds;
    const firstMessagePrompt = buildFirstMessagePrompt(
      store.profiles.find((profile) => profile.userId === leftUserId),
      store.profiles.find((profile) => profile.userId === rightUserId)
    );

    return ConversationMessagesResponseSchema.parse({
      conversation: buildConversationListItem(store, conversation),
      messages: store.messages
        .filter((entry) => entry.conversationId === conversationId)
        .sort((left, right) => left.sentAt.localeCompare(right.sentAt)),
      firstMessagePrompt
    });
  });

  app.post("/conversations", async (request, reply) => {
    const parsed = CreateConversationInputSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid conversation payload.",
        details: parsed.error.flatten()
      });
    }

    const [leftUserId, rightUserId] = parsed.data.participantUserIds;

    if (new Set(parsed.data.participantUserIds).size !== 2) {
      return reply.code(400).send({ error: "Conversations must include two distinct users." });
    }

    const store = await readStore();

    if (
      !store.users.some((user) => user.id === leftUserId) ||
      !store.users.some((user) => user.id === rightUserId)
    ) {
      return reply.code(404).send({ error: "Both users must exist before creating a conversation." });
    }

    if (isBlockedPair(store, leftUserId, rightUserId)) {
      return reply.code(403).send({ error: "One of these users has blocked the other." });
    }

    const existing = store.conversations.find((conversation) => {
      const participants = new Set(conversation.participantUserIds);
      return participants.has(leftUserId) && participants.has(rightUserId);
    });

    if (existing) {
      return {
        conversation: buildConversationListItem(store, existing),
        reused: true
      };
    }

    const timestamp = nowIso();
    const conversation = {
      id: createId("conv"),
      participantUserIds: parsed.data.participantUserIds,
      status: "active" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastMessagePreview: ""
    };

    store.conversations.unshift(conversation);
    await writeStore(store);

    return reply.code(201).send({
      conversation: buildConversationListItem(store, conversation),
      reused: false
    });
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

    if (!conversation.participantUserIds.includes(parsed.data.senderUserId)) {
      return reply.code(403).send({ error: "Sender is not part of this conversation." });
    }

    if (conversation.status === "blocked") {
      return reply.code(403).send({ error: "This conversation is blocked." });
    }

    const message = {
      id: createId("msg"),
      conversationId: parsed.data.conversationId,
      senderUserId: parsed.data.senderUserId,
      body: parsed.data.body.trim(),
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
