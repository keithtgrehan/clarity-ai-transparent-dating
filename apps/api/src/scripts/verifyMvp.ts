import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildApp } from "../app.js";
import { resetStoreFromSeeds } from "../lib/seeds.js";

const viewerUserId = "user-you";

async function main() {
  const tempDirectory = await mkdtemp(join(tmpdir(), "clarity-mvp-"));
  process.env.API_STORAGE_FILE = join(tempDirectory, "local-db.json");

  await resetStoreFromSeeds();

  const app = await buildApp();

  try {
    const health = await app.inject({
      method: "GET",
      url: "/health"
    });
    assert.equal(health.statusCode, 200, "Health check should succeed.");

    const defaultProfileResponse = await app.inject({
      method: "GET",
      url: `/profiles/${viewerUserId}`
    });
    assert.equal(defaultProfileResponse.statusCode, 200, "Profile draft should load.");

    const defaultProfilePayload = defaultProfileResponse.json();
    assert.equal(defaultProfilePayload.exists, false, "Viewer should start without a saved profile.");

    const onboardingPayload = {
      userId: viewerUserId,
      profile: {
        ...defaultProfilePayload.profile,
        displayName: "Riley",
        age: 30,
        locationLabel: "Neukolln and Kreuzberg",
        identity: "nonbinary",
        openTo: ["everyone"],
        diagnosisStatus: "self_identify",
        communicationStyle: "direct",
        socialEnergy: "medium",
        sensoryProfile: {
          noise: "low",
          crowd: "medium",
          calm: "essential"
        },
        routinePreference: "balanced",
        relationshipIntent: "dating_with_intent",
        bio: "I do best with direct updates, calmer plans, and dating that feels explicit rather than performative.",
        whatDrainsMe: "Vague messaging, pressure, and loud first dates.",
        whatINeedFromAPartner: "Directness, steadier pacing, and enough clarity that nobody has to guess."
      }
    };

    const onboarding = await app.inject({
      method: "POST",
      url: "/onboarding",
      payload: onboardingPayload
    });
    assert.equal(onboarding.statusCode, 200, "Onboarding should persist.");

    const persistedProfile = await app.inject({
      method: "GET",
      url: `/profiles/${viewerUserId}`
    });
    assert.equal(persistedProfile.statusCode, 200, "Persisted profile should load.");
    assert.equal(
      persistedProfile.json().profile.onboardingCompleted,
      true,
      "Onboarding should mark the profile complete."
    );

    const matches = await app.inject({
      method: "GET",
      url: `/matches?userId=${viewerUserId}`
    });
    assert.equal(matches.statusCode, 200, "Matches should load.");
    assert.ok(matches.json().candidates.length >= 2, "Viewer should receive seeded matches.");

    const conversation = await app.inject({
      method: "POST",
      url: "/conversations",
      payload: {
        participantUserIds: [viewerUserId, "user-merve"]
      }
    });
    assert.equal(conversation.statusCode, 201, "Conversation creation should succeed.");

    const conversationId = conversation.json().conversation.id as string;

    const sendMessage = await app.inject({
      method: "POST",
      url: "/messages",
      payload: {
        conversationId,
        senderUserId: viewerUserId,
        body: "Hi Merve. Your profile made the pace and environment you prefer very easy to understand."
      }
    });
    assert.equal(sendMessage.statusCode, 201, "Message sending should succeed.");

    const report = await app.inject({
      method: "POST",
      url: "/reports",
      payload: {
        reporterUserId: viewerUserId,
        targetUserId: "user-merve",
        conversationId,
        categories: ["other"],
        description: "Smoke test report to verify the safety flow and block handling.",
        blockUser: true
      }
    });
    assert.equal(report.statusCode, 201, "Report submission should succeed.");

    const matchesAfterBlock = await app.inject({
      method: "GET",
      url: `/matches?userId=${viewerUserId}`
    });
    assert.equal(matchesAfterBlock.statusCode, 200, "Matches should still load after blocking.");
    assert.ok(
      matchesAfterBlock.json().candidates.every(
        (candidate: { candidateUserId: string }) => candidate.candidateUserId !== "user-merve"
      ),
      "Blocked users should be removed from match results."
    );

    console.log("Clarity.ai MVP verification passed.");
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

void main();
