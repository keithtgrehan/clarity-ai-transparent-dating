import assert from "node:assert/strict";
import test from "node:test";
import { readStore } from "../src/lib/store.js";
import { verifyMvp } from "../src/scripts/verifyMvp.js";
import { getLegacyOnboardingPayload, withSyntheticApp } from "./helpers.js";

test("health, profiles, onboarding and legacy match order remain stable", { timeout: 10_000 }, async () => {
  await withSyntheticApp(async (app) => {
    for (const url of ["/health", "/api/health"]) {
      const response = await app.inject({ method: "GET", url });
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), { status: "ok", app: "clarity-ai-api", stage: "mvp" });
    }

    const draft = await app.inject({ method: "GET", url: "/api/profiles/user-you" });
    assert.equal(draft.statusCode, 200);
    assert.equal(draft.json().exists, false);
    assert.equal(draft.json().profile.onboardingCompleted, false);
    assert.equal((await app.inject({ method: "GET", url: "/api/profiles/missing" })).statusCode, 404);

    const before = await app.inject({ method: "GET", url: "/api/matches?userId=user-you" });
    assert.deepEqual(before.json().candidates, []);
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/onboarding", payload: { userId: "user-you" } })).statusCode,
      400
    );

    const payload = await getLegacyOnboardingPayload(app);
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/onboarding", payload: { ...payload, userId: "missing" } })).statusCode,
      404
    );
    assert.equal((await app.inject({ method: "POST", url: "/api/onboarding", payload })).statusCode, 200);

    const persisted = await app.inject({ method: "GET", url: "/api/profiles/user-you" });
    assert.equal(persisted.json().exists, true);
    assert.equal(persisted.json().profile.onboardingCompleted, true);

    const update = await app.inject({
      method: "PUT",
      url: "/api/profiles/user-you",
      payload: { ...payload.profile, bio: "Updated synthetic test biography." }
    });
    assert.equal(update.statusCode, 200);
    assert.equal(update.json().profile.bio, "Updated synthetic test biography.");

    const matches = await app.inject({ method: "GET", url: "/api/matches?userId=user-you" });
    const alias = await app.inject({ method: "GET", url: "/api/matches/candidates?userId=user-you" });
    assert.deepEqual(alias.json(), matches.json());
    assert.deepEqual(
      matches.json().candidates.map((candidate: { candidateUserId: string }) => candidate.candidateUserId),
      ["user-jonas", "user-lara", "user-merve", "user-emre", "user-noor"]
    );
    const jonas = matches.json().candidates[0];
    assert.deepEqual(jonas.whyItCouldWork, [
      "You want the same kind of relationship pace and direction.",
      "You both prefer Direct communication.",
      "Your planning styles line up well for early dating."
    ]);
    assert.deepEqual(jonas.sharedSignals, [
      "Direct communication",
      "Medium social energy",
      "Balanced planning"
    ]);
    assert.deepEqual(jonas.potentialFriction, []);
    assert.equal(jonas.confidence, "high");
  });
});

test("conversations, messages, report and block happy paths use a temporary store", { timeout: 10_000 }, async () => {
  await withSyntheticApp(async (app) => {
    const payload = await getLegacyOnboardingPayload(app);
    await app.inject({ method: "POST", url: "/api/onboarding", payload });

    const list = await app.inject({ method: "GET", url: "/api/conversations?userId=user-you" });
    assert.ok(list.json().conversations.some((conversation: { id: string }) => conversation.id === "conv-you-jonas"));
    const seededMessages = await app.inject({ method: "GET", url: "/api/conversations/conv-you-jonas/messages" });
    assert.equal(seededMessages.statusCode, 200);
    assert.deepEqual(
      seededMessages.json().messages.map((message: { sentAt: string }) => message.sentAt),
      [...seededMessages.json().messages.map((message: { sentAt: string }) => message.sentAt)].sort()
    );

    assert.equal(
      (await app.inject({ method: "POST", url: "/api/conversations", payload: { participantUserIds: ["user-you", "user-you"] } })).statusCode,
      400
    );
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/conversations", payload: { participantUserIds: ["user-you", "missing"] } })).statusCode,
      404
    );

    const created = await app.inject({
      method: "POST",
      url: "/api/conversations",
      payload: { participantUserIds: ["user-you", "user-merve"] }
    });
    assert.equal(created.statusCode, 201);
    const conversationId = created.json().conversation.id as string;
    const reused = await app.inject({
      method: "POST",
      url: "/api/conversations",
      payload: { participantUserIds: ["user-you", "user-merve"] }
    });
    assert.equal(reused.statusCode, 200);
    assert.equal(reused.json().reused, true);

    assert.equal(
      (await app.inject({
        method: "POST",
        url: "/api/messages",
        payload: { conversationId, senderUserId: "user-jonas", body: "Synthetic nonparticipant message." }
      })).statusCode,
      403
    );
    const sent = await app.inject({
      method: "POST",
      url: "/api/messages",
      payload: { conversationId, senderUserId: "user-you", body: "  Synthetic valid message.  " }
    });
    assert.equal(sent.statusCode, 201);
    assert.equal(sent.json().message.body, "Synthetic valid message.");

    const report = await app.inject({
      method: "POST",
      url: "/api/reports",
      payload: {
        reporterUserId: "user-you",
        targetUserId: "user-merve",
        conversationId,
        categories: ["other"],
        description: "Synthetic report used to characterize immediate block behavior.",
        blockUser: true
      }
    });
    assert.equal(report.statusCode, 201);
    const after = await app.inject({ method: "GET", url: "/api/matches?userId=user-you" });
    assert.ok(after.json().candidates.every((candidate: { candidateUserId: string }) => candidate.candidateUserId !== "user-merve"));
    assert.equal((await readStore()).conversations.find((item) => item.id === conversationId)?.status, "blocked");
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/messages", payload: { conversationId, senderUserId: "user-you", body: "Blocked." } })).statusCode,
      403
    );
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/conversations", payload: { participantUserIds: ["user-you", "user-merve"] } })).statusCode,
      403
    );
  });
});

test("waitlist validation and disabled seed endpoint preserve store state", { timeout: 10_000 }, async () => {
  await withSyntheticApp(async (app) => {
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/waitlist/leads", payload: { firstName: "Test", email: "bad", city: "Berlin" } })).statusCode,
      400
    );
    const lead = await app.inject({
      method: "POST",
      url: "/api/waitlist/leads",
      payload: { firstName: "Synthetic", email: "synthetic@example.test", city: "Berlin" }
    });
    assert.equal(lead.statusCode, 201);
    assert.ok((await readStore()).waitlistLeads.some((item) => item.email === "synthetic@example.test"));

    const before = await readStore();
    const previous = process.env.ALLOW_SEED_ENDPOINT;
    process.env.ALLOW_SEED_ENDPOINT = "false";
    try {
      assert.equal((await app.inject({ method: "POST", url: "/api/admin/load-seeds" })).statusCode, 403);
      assert.deepEqual(await readStore(), before);
    } finally {
      if (previous === undefined) delete process.env.ALLOW_SEED_ENDPOINT;
      else process.env.ALLOW_SEED_ENDPOINT = previous;
    }
  });
});

test("exported MVP verifier completes and cleans up", { timeout: 10_000 }, async () => {
  await verifyMvp();
});

test.todo("[SEC-001] authenticate profile, match and conversation-list routes with server-owned identity");
test.todo("[SEC-002] authorize conversation message reads against authenticated membership");
test.todo("[SEC-003] validate reporter ownership, target and evidence relationships");
test.todo("[SEC-004] make the destructive seed endpoint default-deny and privileged");
test.todo("[SEC-005] make CORS default-deny outside an explicit local-development mode");
