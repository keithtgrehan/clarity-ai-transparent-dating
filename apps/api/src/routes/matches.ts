import type { FastifyInstance } from "fastify";
import { MatchCandidateListResponseSchema } from "@project-a-z/shared";
import { readStore } from "../lib/store.js";
import { getMatchCandidates } from "../services/matching.js";

function isExcludedByNeurotypePreference(
  requesterUserNeurotypes: string[],
  candidateUserNeurotypes: string[],
  requesterPreference: "nd_only" | "prefer_nd" | "open_later",
  candidatePreference: "nd_only" | "prefer_nd" | "open_later"
) {
  const requesterIsNdOnly = requesterPreference === "nd_only";
  const candidateIsNdOnly = candidatePreference === "nd_only";
  const requesterIsOnlyNt =
    requesterUserNeurotypes.includes("neurotypical") &&
    requesterUserNeurotypes.every((entry) => entry === "neurotypical");
  const candidateIsOnlyNt =
    candidateUserNeurotypes.includes("neurotypical") &&
    candidateUserNeurotypes.every((entry) => entry === "neurotypical");

  if (requesterIsNdOnly && candidateIsOnlyNt) {
    return true;
  }

  if (candidateIsNdOnly && requesterIsOnlyNt) {
    return true;
  }

  return false;
}

export async function registerMatchRoutes(app: FastifyInstance) {
  app.get("/matches/candidates", async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({ error: "userId query parameter is required." });
    }

    const store = await readStore();
    const userProfile = store.profiles.find((entry) => entry.userId === userId);
    const user = store.users.find((entry) => entry.id === userId);

    if (!userProfile || !user) {
      return reply.code(404).send({ error: "User profile not found." });
    }

    const blockedUserIds = new Set(
      store.reports
        .filter((entry) => entry.reporterUserId === userId && entry.blockUser)
        .map((entry) => entry.targetUserId)
    );

    const candidates = getMatchCandidates(
      userProfile,
      store.profiles.filter((candidateProfile) => {
        const candidateUser = store.users.find((entry) => entry.id === candidateProfile.userId);

        if (!candidateUser) {
          return false;
        }

        if (blockedUserIds.has(candidateProfile.userId)) {
          return false;
        }

        return !isExcludedByNeurotypePreference(
          user.neurotypeContexts,
          candidateUser.neurotypeContexts,
          userProfile.neurotypeMatchPreference,
          candidateProfile.neurotypeMatchPreference
        );
      })
    );

    return MatchCandidateListResponseSchema.parse({
      userId,
      candidates
    });
  });
}
