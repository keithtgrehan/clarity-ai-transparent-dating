import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { resetStoreFromSeeds } from "../lib/seeds.js";

const viewerUserId = "user-you";

export async function verifyMvp() {
  const tempDirectory = await mkdtemp(join(tmpdir(), "clarity-mvp-"));
  const previousStorageFile = process.env.API_STORAGE_FILE;
  process.env.API_STORAGE_FILE = join(tempDirectory, "local-db.json");
  let app: FastifyInstance | undefined;

  try {
    await resetStoreFromSeeds();
    app = await buildApp({ logger: false });

    const health = await app.inject({ method: "GET", url: "/health" });
    assert.equal(health.statusCode, 200, "Health check should succeed.");

    const defaultProfileResponse = await app.inject({
      method: "GET",
      url: `/api/profiles/${viewerUserId}`
    });
    assert.equal(defaultProfileResponse.statusCode, 200, "Profile draft should load.");
    const defaultProfilePayload = defaultProfileResponse.json();
    assert.equal(defaultProfilePayload.exists, false, "Viewer should start without a saved profile.");

    const onboarding = await app.inject({
      method: "POST",
      url: "/api/onboarding",
      payload: {
        userId: viewerUserId,
        profile: {
          ...defaultProfilePayload.profile,
          displayName: "Riley",
          age: 30,
          locationLabel: "Neukolln and Kreuzberg",
          identity: "audhd",
          openTo: ["adhd", "autism", "audhd"],
          diagnosisStatus: "self_identified",
          communicationStyle: "direct",
          socialEnergy: "medium",
          sensoryProfile: { noise: "low", crowd: "medium", calm: "essential" },
          routinePreference: "balanced",
          relationshipIntent: "dating_with_intent",
          bio: "Synthetic smoke profile for direct communication and calm plans.",
          whatDrainsMe: "Ambiguous plans in this synthetic scenario.",
          whatINeedFromAPartner: "Clear expectations in this synthetic scenario."
        }
      }
    });
    assert.equal(onboarding.statusCode, 200, "Onboarding should persist.");

    const persistedProfile = await app.inject({
      method: "GET",
      url: `/api/profiles/${viewerUserId}`
    });
    assert.equal(persistedProfile.json().profile.onboardingCompleted, true);

    const matches = await app.inject({
      method: "GET",
      url: `/api/matches?userId=${viewerUserId}`
    });
    assert.deepEqual(
      matches.json().candidates.map((candidate: { candidateUserId: string }) => candidate.candidateUserId),
      ["user-jonas", "user-lara", "user-merve", "user-emre", "user-noor"],
      "Legacy candidate ordering should remain stable during the governed-foundation cut."
    );

    const conversation = await app.inject({
      method: "POST",
      url: "/api/conversations",
      payload: { participantUserIds: [viewerUserId, "user-merve"] }
    });
    assert.equal(conversation.statusCode, 201);
    const conversationId = conversation.json().conversation.id as string;

    const message = await app.inject({
      method: "POST",
      url: "/api/messages",
      payload: {
        conversationId,
        senderUserId: viewerUserId,
        body: "Synthetic smoke message about an explicit first-date plan."
      }
    });
    assert.equal(message.statusCode, 201);

    const report = await app.inject({
      method: "POST",
      url: "/api/reports",
      payload: {
        reporterUserId: viewerUserId,
        targetUserId: "user-merve",
        conversationId,
        categories: ["other"],
        description: "Synthetic smoke report used only to verify block handling.",
        blockUser: true
      }
    });
    assert.equal(report.statusCode, 201);

    const matchesAfterBlock = await app.inject({
      method: "GET",
      url: `/api/matches?userId=${viewerUserId}`
    });
    assert.ok(
      matchesAfterBlock
        .json()
        .candidates.every(
          (candidate: { candidateUserId: string }) => candidate.candidateUserId !== "user-merve"
        )
    );

    console.log("Clarity local MVP verification passed with synthetic data.");
  } finally {
    await app?.close();
    await rm(tempDirectory, { recursive: true, force: true });
    if (previousStorageFile === undefined) {
      delete process.env.API_STORAGE_FILE;
    } else {
      process.env.API_STORAGE_FILE = previousStorageFile;
    }
  }
}

const isCli = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  verifyMvp().catch((error) => {
    console.error("Clarity local MVP verification failed.", error);
    process.exitCode = 1;
  });
}
