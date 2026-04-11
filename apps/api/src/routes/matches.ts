import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MatchCandidateListResponseSchema, type LocalDataStore } from "@clarity/shared";
import { createDefaultProfile } from "../lib/profiles.js";
import { readStore } from "../lib/store.js";
import { getMatchCandidates } from "../services/matching.js";

function isBlockedPair(store: LocalDataStore, leftUserId: string, rightUserId: string) {
  return store.reports.some(
    (report) =>
      report.blockUser &&
      ((report.reporterUserId === leftUserId && report.targetUserId === rightUserId) ||
        (report.reporterUserId === rightUserId && report.targetUserId === leftUserId))
  );
}

export async function registerMatchRoutes(app: FastifyInstance) {
  const handler = async (
    request: FastifyRequest<{ Querystring: { userId?: string } }>,
    reply: FastifyReply
  ) => {
    const { userId } = request.query;

    if (!userId) {
      return reply.code(400).send({ error: "userId query parameter is required." });
    }

    const store = await readStore();
    const user = store.users.find((entry) => entry.id === userId);

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    const userProfile = store.profiles.find((entry) => entry.userId === userId) ?? createDefaultProfile(user);

    if (!userProfile.onboardingCompleted) {
      return MatchCandidateListResponseSchema.parse({
        userId,
        candidates: []
      });
    }

    const candidates = getMatchCandidates(
      userProfile,
      store.profiles.filter((candidate) => {
        if (candidate.userId === userId) {
          return false;
        }

        return !isBlockedPair(store, userId, candidate.userId);
      })
    );

    return MatchCandidateListResponseSchema.parse({
      userId,
      candidates
    });
  };

  app.get("/matches", handler);
  app.get("/matches/candidates", handler);
}
