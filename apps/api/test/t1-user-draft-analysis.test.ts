import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CommunicationAnalysisCueCopy,
  CommunicationAnalysisLimitations,
  T1PrivacyReviewLimitation,
  T1UserDraftAnalysisResponseSchema,
  T1UserDraftContinueRequestSchema,
  T1UserDraftPrepareRequestSchema,
  T1UserDraftPrepareResponseSchema,
  type T1UserDraftAnalysisResponse
} from "@clarity/shared";
import type { FastifyRequest } from "fastify";
import { resolveRepoPath } from "../src/lib/paths.js";
import type { SignalEngineSettings } from "../src/services/signal/settings.js";
import { readSignalEngineSettings } from "../src/services/signal/settings.js";
import {
  FixedLocalT1AuthenticationProvider,
  TestOnlyT1AuthenticationProvider,
  type T1AuthenticationContext,
  type T1AuthenticationProvider
} from "../src/services/signal/t1-auth.js";
import {
  TestOnlyT1PrivacyAdmissionProvider
} from "../src/services/signal/t1-admission.js";
import {
  TestOnlyT1PurposeConsentProvider
} from "../src/services/signal/t1-consent.js";
import {
  T1EphemeralSessionStore,
  T1SessionCapacityError
} from "../src/services/signal/t1-session-store.js";
import { withSyntheticApp } from "./helpers.js";

const INTERNAL_SECRET = "fictional-t1-test-secret-with-at-least-32-characters";
const ADMISSION = `pa_${"0".repeat(64)}`;
const DETECTOR = `dv_${"1".repeat(64)}`;
const NONCE = `sn_${"2".repeat(64)}`;
const CONSENT_BINDING = {
  consentPolicyVersion: "t1-policy-test-v1",
  consentNoticeVersion: "t1-notice-test-v1",
  consentEffectiveAt: "2030-01-01T00:00:00.000Z"
} as const;
const TEST_ENV = { APP_ENV: "test", NODE_ENV: "test" };
const FICTIONAL_DRAFT =
  "Hello Jordan Example, perhaps we could meet near Fictional Platz on Saturday afternoon.";

function t1Settings(overrides: Partial<SignalEngineSettings> = {}): SignalEngineSettings {
  return {
    enabled: true,
    syntheticOnly: true,
    t1ProtocolEnabled: true,
    userAuthoredText: true,
    receivedExcerpts: false,
    audioEnabled: false,
    modelTrainingEnabled: false,
    localAuthBypass: false,
    appEnvironment: "test",
    internalUrl: "http://127.0.0.1:8091",
    internalSecret: INTERNAL_SECRET,
    timeoutMs: 1_000,
    rateLimitMax: 100,
    rateLimitWindowMs: 60_000,
    ...overrides
  };
}

class MutableServerOwnedAuth implements T1AuthenticationProvider {
  readonly providerId = "test-server-owned-mutable";
  subject = "subject-alpha";

  async authenticate(_request: FastifyRequest): Promise<T1AuthenticationContext> {
    return {
      subject: this.subject,
      providerId: this.providerId,
      authenticatedAt: new Date().toISOString()
    };
  }
}

function preparePayload(draft = FICTIONAL_DRAFT) {
  return {
    task: "draft_review" as const,
    sourceClass: "self_authored_draft" as const,
    profileId: "wording_support" as const,
    languageTag: "en-EU" as const,
    draft
  };
}

const validAnalysis: T1UserDraftAnalysisResponse = {
  schema_version: "2.0.0",
  analysis_id: "an_0123456789abcdef01234567",
  low_signal: false,
  privacy_receipt: {
    potential_identifier_counts: {
      person_name: 1,
      location: 1,
      contact: 0,
      online_handle: 0,
      identifier: 0,
      other: 0
    },
    redaction_total: 2,
    detector_status: "SYNTHETIC_TEST_DOUBLE_APPLIED",
    text_released: false,
    text_persisted: false,
    limitation: T1PrivacyReviewLimitation
  },
  cues: [
    {
      canonical_id: "communication.ambiguity",
      rule_id: "ambiguity_marker_count",
      observation: CommunicationAnalysisCueCopy["communication.ambiguity"].observation,
      limitation: CommunicationAnalysisCueCopy["communication.ambiguity"].limitation,
      sanitized_range: { start: 0, end: 8 },
      evidence_sufficiency: "deterministic"
    }
  ],
  repair_action: { ...CommunicationAnalysisCueCopy["communication.ambiguity"].repair_action },
  limitations: [...CommunicationAnalysisLimitations],
  provenance: {
    engine_version: "0.1.0",
    ruleset_version: "2026-07-15.1",
    cue_registry_version: "1.0.0",
    privacy_detector_id: "synthetic-test-double",
    privacy_detector_revision: "fixture-only",
    privacy_detector_status: "SYNTHETIC_TEST_DOUBLE_APPLIED",
    privacy_admission_fingerprint: ADMISSION,
    semantic_model_id: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    semantic_model_revision: "e8f8c211226b894fcb81acc59f3b34ba3efd5f42",
    semantic_status: "abstain_disabled_by_policy"
  }
};

function createPrivateFetch(options: { holdContinue?: boolean } = {}) {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  let releaseContinue: (() => void) | undefined;
  const continueGate = options.holdContinue
    ? new Promise<void>((resolve) => {
        releaseContinue = resolve;
      })
    : Promise.resolve();

  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push({ url, body });
    assert.equal(new Headers(init?.headers).get("x-internal-service-secret"), INTERNAL_SECRET);
    assert.equal(init?.redirect, "error");

    if (url.endsWith("/prepare")) {
      return new Response(
        JSON.stringify({
          schema_version: "2.0.0",
          internal_nonce: NONCE,
          expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
          redacted_preview:
            "Hello [PERSON], perhaps we could meet near [LOCATION] on Saturday afternoon.",
          potential_identifier_counts: {
            person_name: 1,
            location: 1,
            contact: 0,
            online_handle: 0,
            identifier: 0,
            other: 0
          },
          detector_version: DETECTOR,
          sanitized_text_bytes: 82,
          admission_snapshot: ADMISSION,
          limitation: T1PrivacyReviewLimitation
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.endsWith("/continue")) {
      await continueGate;
      if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return new Response(JSON.stringify(validAnalysis), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.endsWith("/clear")) return new Response(null, { status: 204 });
    throw new Error("Unexpected private route in fictional test.");
  };
  return { fetchImpl, requests, releaseContinue: () => releaseContinue?.() };
}

function dependencies(subject = "subject-alpha") {
  const auth = new MutableServerOwnedAuth();
  auth.subject = subject;
  const consent = new TestOnlyT1PurposeConsentProvider(TEST_ENV);
  consent.grant(subject);
  const admission = new TestOnlyT1PrivacyAdmissionProvider(ADMISSION, TEST_ENV);
  return { auth, consent, admission };
}

test("T1 shared contracts are separate, strict and closed", () => {
  assert.equal(T1UserDraftPrepareRequestSchema.safeParse(preparePayload("x".repeat(4_000))).success, true);
  assert.equal(T1UserDraftPrepareRequestSchema.safeParse(preparePayload("x".repeat(4_001))).success, false);
  assert.equal(
    T1UserDraftPrepareRequestSchema.safeParse({ ...preparePayload(), userId: "body-authority" }).success,
    false
  );
  assert.equal(
    T1UserDraftContinueRequestSchema.safeParse({ reviewToken: `rt_${"a".repeat(43)}`, confirmed: true }).success,
    true
  );
  assert.equal(
    T1UserDraftContinueRequestSchema.safeParse({
      reviewToken: `rt_${"a".repeat(43)}`,
      confirmed: true,
      previewHash: `ph_${"b".repeat(64)}`
    }).success,
    false
  );
  assert.equal(T1UserDraftAnalysisResponseSchema.safeParse(validAnalysis).success, true);
  assert.equal(
    T1UserDraftAnalysisResponseSchema.safeParse({
      ...validAnalysis,
      provenance: {
        ...validAnalysis.provenance,
        privacy_detector_revision: "374ece89b2099818244f5a65ef466b89c0c392ae"
      }
    }).success,
    false
  );
  for (const forbidden of ["raw_text", "source_text", "redacted_preview", "review_token"]) {
    assert.equal(
      T1UserDraftAnalysisResponseSchema.safeParse({ ...validAnalysis, [forbidden]: FICTIONAL_DRAFT }).success,
      false
    );
  }
  assert.equal(
    T1UserDraftAnalysisResponseSchema.safeParse({
      ...validAnalysis,
      cues: [...validAnalysis.cues, ...validAnalysis.cues, ...validAnalysis.cues, ...validAnalysis.cues]
    }).success,
    false
  );
});

test("the real Python T1 output fixture is accepted by the exact public schema", async () => {
  const fixturePath = resolveRepoPath(
    "services/signal-engine/tests/fixtures/t1_fastify_fastapi_contract_response.json"
  );
  const fixture = JSON.parse(
    await readFile(fixturePath, "utf8")
  );
  assert.equal(T1UserDraftAnalysisResponseSchema.safeParse(fixture).success, true);

  const mutationFixture = JSON.parse(
    await readFile(
      resolveRepoPath(
        "services/signal-engine/tests/fixtures/t1_contract_mutations.json"
      ),
      "utf8"
    )
  );
  for (const mutation of mutationFixture.mutations as Array<{
    mutation_id: string;
    path?: Array<string | number>;
    value?: unknown;
    changes?: Array<{ path: Array<string | number>; value: unknown }>;
  }>) {
    const candidate = structuredClone(fixture) as Record<string, unknown>;
    const changes = mutation.changes ?? [{ path: mutation.path!, value: mutation.value }];
    for (const change of changes) {
      let target: unknown = candidate;
      for (const segment of change.path.slice(0, -1)) {
        target = (target as Record<string | number, unknown>)[segment];
      }
      const finalSegment = change.path.at(-1);
      assert.notEqual(finalSegment, undefined);
      (target as Record<string | number, unknown>)[finalSegment!] = change.value;
    }
    assert.equal(
      T1UserDraftAnalysisResponseSchema.safeParse(candidate).success,
      false,
      mutation.mutation_id
    );
  }
});

test("environment settings remain default deny and cannot enable T1 real text or training", () => {
  const defaults = readSignalEngineSettings({ APP_ENV: "local" });
  assert.equal(defaults.enabled, false);
  assert.equal(defaults.syntheticOnly, true);
  assert.equal(defaults.t1ProtocolEnabled, false);
  assert.equal(defaults.userAuthoredText, false);
  assert.equal(defaults.modelTrainingEnabled, false);

  for (const flag of ["SIGNAL_ENGINE_USER_AUTHORED_TEXT", "SIGNAL_ENGINE_MODEL_TRAINING"]) {
    assert.throws(() => readSignalEngineSettings({ APP_ENV: "test", [flag]: "true" }), /Prohibited/);
  }
  assert.throws(
    () =>
      readSignalEngineSettings({
        APP_ENV: "test",
        SIGNAL_ENGINE_T1_PROTOCOL_ENABLED: "true"
      }),
    /requires the local synthetic/
  );
});

test("test-only authorities require both test environment markers", () => {
  for (const environment of [
    { APP_ENV: "test", NODE_ENV: "development" },
    { APP_ENV: "local", NODE_ENV: "test" },
    { APP_ENV: "local", NODE_ENV: "development" }
  ]) {
    assert.throws(() => new TestOnlyT1AuthenticationProvider("subject-alpha", environment), /outside tests/);
    assert.throws(() => new TestOnlyT1PurposeConsentProvider(environment), /outside tests/);
    assert.throws(() => new TestOnlyT1PrivacyAdmissionProvider(ADMISSION, environment), /outside tests/);
  }
  assert.doesNotThrow(() => new TestOnlyT1AuthenticationProvider("subject-alpha", TEST_ENV));
  assert.throws(
    () => new FixedLocalT1AuthenticationProvider("local", false),
    /explicit local review/
  );
  assert.throws(
    () => new FixedLocalT1AuthenticationProvider("production", true),
    /explicit local review/
  );
  assert.doesNotThrow(() => new FixedLocalT1AuthenticationProvider("local", true));
});

test("T1 routes are omitted unless all injected test gates are explicit", async () => {
  const privateMock = createPrivateFetch();
  const deps = dependencies();
  for (const override of [
    { t1ProtocolEnabled: false },
    { userAuthoredText: false },
    { syntheticOnly: false },
    { appEnvironment: "local" }
  ]) {
    await withSyntheticApp(
      async (app) => {
        const response = await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        });
        assert.equal(response.statusCode, 404);
      },
      {
        signalEngine: t1Settings(override),
        signalFetch: privateMock.fetchImpl,
        t1UserDraft: {
          authenticationProvider: deps.auth,
          consentProvider: deps.consent,
          privacyAdmissionProvider: deps.admission
        }
      }
    );
  }
  assert.equal(privateMock.requests.length, 0);
});

test("authentication, consent and privacy admission independently fail closed", async () => {
  const privateMock = createPrivateFetch();
  const deps = dependencies();
  await withSyntheticApp(
    async (app) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: { ...preparePayload(), userId: "body-cannot-authorize" }
      });
      assert.equal(response.statusCode, 401);
      assert.deepEqual(response.json(), { error: "Authentication required." });
    },
    { signalEngine: t1Settings(), signalFetch: privateMock.fetchImpl }
  );

  const noConsent = new TestOnlyT1PurposeConsentProvider(TEST_ENV);
  await withSyntheticApp(
    async (app) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload()
      });
      assert.equal(response.statusCode, 403);
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: { authenticationProvider: deps.auth, consentProvider: noConsent }
    }
  );

  await withSyntheticApp(
    async (app) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload()
      });
      assert.equal(response.statusCode, 503);
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: { authenticationProvider: deps.auth, consentProvider: deps.consent }
    }
  );
  assert.equal(privateMock.requests.length, 0);
});

test("exact consent policy, notice and effective grant are validated and session-bound", async () => {
  const privateMock = createPrivateFetch();
  const deps = dependencies();
  deps.consent.grant("subject-alpha", { policyVersion: "stale-policy" });
  await withSyntheticApp(
    async (app) => {
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).statusCode,
        403
      );

      deps.consent.grant("subject-alpha");
      const review = T1UserDraftPrepareResponseSchema.parse(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).json()
      );
      deps.consent.grant("subject-alpha", { effectiveAt: "2031-01-01T00:00:00.000Z" });
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/continue",
          payload: { reviewToken: review.reviewToken, confirmed: true }
        })).statusCode,
        403
      );
      deps.consent.grant("subject-alpha");
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/continue",
          payload: { reviewToken: review.reviewToken, confirmed: true }
        })).statusCode,
        410
      );
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission
      }
    }
  );
});

test("prepare returns only a bounded privacy review and continue is single-use", async () => {
  const privateMock = createPrivateFetch();
  const deps = dependencies();
  const sessions = new T1EphemeralSessionStore();
  await withSyntheticApp(
    async (app) => {
      const prepared = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload()
      });
      assert.equal(prepared.statusCode, 200);
      assert.equal(prepared.headers["cache-control"], "no-store, max-age=0");
      assert.equal(prepared.headers.pragma, "no-cache");
      const review = T1UserDraftPrepareResponseSchema.parse(prepared.json());
      assert.match(review.reviewToken, /^rt_[A-Za-z0-9_-]{43}$/);
      assert.match(review.previewHash, /^ph_[0-9a-f]{64}$/);
      assert.doesNotMatch(prepared.body, /Jordan Example|Fictional Platz/);
      assert.equal(sessions.stats().activeSessions, 1);

      const privatePrepare = privateMock.requests.find((entry) => entry.url.endsWith("/prepare"));
      assert.deepEqual(Object.keys(privatePrepare?.body ?? {}).sort(), [
        "authority",
        "language_tag",
        "profile_id",
        "schema_version",
        "task",
        "text"
      ]);
      assert.equal(privatePrepare?.body.text, FICTIONAL_DRAFT);
      assert.deepEqual(privatePrepare?.body.authority, {
        source_class: "self_authored_draft"
      });
      assert.equal("subject" in (privatePrepare?.body ?? {}), false);

      const continued = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/continue",
        payload: { reviewToken: review.reviewToken, confirmed: true }
      });
      assert.equal(continued.statusCode, 200);
      assert.deepEqual(continued.json(), validAnalysis);
      assert.doesNotMatch(continued.body, /Jordan Example|Fictional Platz|\[PERSON\]|\[LOCATION\]/);
      assert.equal(sessions.stats().activeSessions, 0);

      const replay = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/continue",
        payload: { reviewToken: review.reviewToken, confirmed: true }
      });
      assert.equal(replay.statusCode, 410);
      assert.doesNotMatch(replay.body, new RegExp(review.reviewToken));
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission,
        sessionStore: sessions
      }
    }
  );
});

test("prepare validates size, language, task, profile and source without proxying", async () => {
  const privateMock = createPrivateFetch();
  const deps = dependencies();
  await withSyntheticApp(
    async (app) => {
      for (const [payload, status] of [
        [preparePayload("x".repeat(4_001)), 413],
        [{ ...preparePayload(), languageTag: "de-DE" }, 422],
        [{ ...preparePayload(), task: "message_excerpt_review" }, 400],
        [{ ...preparePayload(), sourceClass: "received_excerpt" }, 400],
        [{ ...preparePayload(), profileId: "neuro_divergent" }, 400]
      ] as const) {
        const response = await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload
        });
        assert.equal(response.statusCode, status);
        assert.equal(response.headers["cache-control"], "no-store, max-age=0");
        assert.doesNotMatch(response.body, /x{50}|de-DE|received_excerpt|neuro_divergent/);
      }
      const accepted = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload("x".repeat(4_000))
      });
      assert.equal(accepted.statusCode, 200);
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission
      }
    }
  );
  assert.equal(privateMock.requests.filter((entry) => entry.url.endsWith("/prepare")).length, 1);
});

test("one active session, cross-subject denial, withdrawal and idempotent clear are enforced", async () => {
  const privateMock = createPrivateFetch();
  const deps = dependencies();
  deps.consent.grant("subject-beta");
  await withSyntheticApp(
    async (app) => {
      const first = T1UserDraftPrepareResponseSchema.parse(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).json()
      );
      const second = T1UserDraftPrepareResponseSchema.parse(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).json()
      );
      assert.notEqual(first.reviewToken, second.reviewToken);
      assert.notEqual(first.previewHash, second.previewHash);
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/continue",
          payload: { reviewToken: first.reviewToken, confirmed: true }
        })).statusCode,
        410
      );

      deps.auth.subject = "subject-beta";
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/clear",
          payload: { reviewToken: second.reviewToken }
        })).statusCode,
        403
      );
      deps.auth.subject = "subject-alpha";
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/clear",
          payload: { reviewToken: second.reviewToken }
        })).statusCode,
        204
      );
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/clear",
          payload: { reviewToken: second.reviewToken }
        })).statusCode,
        204
      );

      const third = T1UserDraftPrepareResponseSchema.parse(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).json()
      );
      await deps.consent.withdraw("subject-alpha");
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/continue",
          payload: { reviewToken: third.reviewToken, confirmed: true }
        })).statusCode,
        403
      );
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission
      }
    }
  );
});

test("changed admission consumes the review and capacity/rate limits fail closed", async () => {
  const privateMock = createPrivateFetch();
  const deps = dependencies();
  await withSyntheticApp(
    async (app) => {
      const review = T1UserDraftPrepareResponseSchema.parse(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).json()
      );
      deps.admission.setState({ admitted: true, snapshot: `pa_${"3".repeat(64)}` });
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/continue",
          payload: { reviewToken: review.reviewToken, confirmed: true }
        })).statusCode,
        503
      );
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/continue",
          payload: { reviewToken: review.reviewToken, confirmed: true }
        })).statusCode,
        410
      );
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission
      }
    }
  );

  const capacityDeps = dependencies();
  await withSyntheticApp(
    async (app) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload()
      });
      assert.equal(response.statusCode, 429);
      assert.doesNotMatch(response.body, /Jordan|Fictional|sn_/);
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: capacityDeps.auth,
        consentProvider: capacityDeps.consent,
        privacyAdmissionProvider: capacityDeps.admission,
        sessionStore: new T1EphemeralSessionStore({ maxSessions: 0 })
      }
    }
  );

  const rateDeps = dependencies();
  const rateSessions = new T1EphemeralSessionStore();
  await withSyntheticApp(
    async (app) => {
      const review = T1UserDraftPrepareResponseSchema.parse(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).json()
      );
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).statusCode,
        429
      );
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/clear",
          payload: { reviewToken: review.reviewToken }
        })).statusCode,
        204
      );
      assert.deepEqual(
        rateSessions.stats(),
        { activeSessions: 0, totalMinimizedTextBytes: 0 }
      );
    },
    {
      signalEngine: t1Settings({ rateLimitMax: 1 }),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: rateDeps.auth,
        consentProvider: rateDeps.consent,
        privacyAdmissionProvider: rateDeps.admission,
        sessionStore: rateSessions
      }
    }
  );
});

test("concurrent same-subject prepare retains the successful review when its predecessor exceeds capacity", async () => {
  const firstNonce = `sn_${"a".repeat(64)}`;
  const secondNonce = `sn_${"b".repeat(64)}`;
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  let prepareCount = 0;
  let releaseFirst!: () => void;
  let markFirstEntered!: () => void;
  const firstEntered = new Promise<void>((resolve) => {
    markFirstEntered = resolve;
  });
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const signalFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push({ url, body });
    if (url.endsWith("/prepare")) {
      prepareCount += 1;
      const isFirst = prepareCount === 1;
      if (isFirst) {
        markFirstEntered();
        await firstGate;
      }
      const minimizedTextBytes = isFirst ? 101 : 90;
      return new Response(
        JSON.stringify({
          schema_version: "2.0.0",
          internal_nonce: isFirst ? firstNonce : secondNonce,
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          redacted_preview: "f".repeat(minimizedTextBytes),
          potential_identifier_counts: {
            person_name: 0,
            location: 0,
            contact: 0,
            online_handle: 0,
            identifier: 0,
            other: 0
          },
          detector_version: DETECTOR,
          sanitized_text_bytes: minimizedTextBytes,
          admission_snapshot: ADMISSION,
          limitation: T1PrivacyReviewLimitation
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.endsWith("/continue")) {
      assert.equal(body.internal_nonce, secondNonce);
      return new Response(JSON.stringify(validAnalysis), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.endsWith("/clear")) return new Response(null, { status: 204 });
    throw new Error("Unexpected private route in concurrent fictional test.");
  };
  const deps = dependencies();
  const sessions = new T1EphemeralSessionStore({ maxSessions: 1, maxMinimizedTextBytes: 100 });

  await withSyntheticApp(
    async (app) => {
      const first = app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload("First wholly fictional concurrent draft with enough words.")
      });
      await firstEntered;
      const second = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload("Second wholly fictional concurrent draft with enough words.")
      });
      assert.equal(second.statusCode, 200);
      const retainedReview = T1UserDraftPrepareResponseSchema.parse(second.json());

      releaseFirst();
      const refused = await first;
      assert.equal(refused.statusCode, 429);
      assert.deepEqual(sessions.stats(), { activeSessions: 1, totalMinimizedTextBytes: 90 });
      const clearedBeforeContinue = requests
        .filter((entry) => entry.url.endsWith("/clear"))
        .map((entry) => entry.body.internal_nonce);
      assert.deepEqual(clearedBeforeContinue, [firstNonce]);
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/continue",
          payload: { reviewToken: retainedReview.reviewToken, confirmed: true }
        })).statusCode,
        200
      );
      const clearedNonces = requests
        .filter((entry) => entry.url.endsWith("/clear"))
        .map((entry) => entry.body.internal_nonce);
      assert.deepEqual(clearedNonces, [firstNonce, secondNonce]);
    },
    {
      signalEngine: t1Settings(),
      signalFetch,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission,
        sessionStore: sessions
      }
    }
  );
});

test("ephemeral store enforces ten minutes, 1000 sessions, 16 MiB and restart invalidation", () => {
  assert.throws(() => new T1EphemeralSessionStore({ ttlMs: 10 * 60_000 + 1 }), RangeError);
  assert.throws(() => new T1EphemeralSessionStore({ maxSessions: 1_001 }), RangeError);
  assert.throws(
    () => new T1EphemeralSessionStore({ maxMinimizedTextBytes: 16 * 1024 * 1024 + 1 }),
    RangeError
  );
  let now = 1_800_000_000_000;
  let monotonicNow = 10_000;
  const store = new T1EphemeralSessionStore({
    now: () => now,
    monotonicNow: () => monotonicNow
  });
  const session = store.create({
    ...CONSENT_BINDING,
    subject: "subject-alpha",
    internalNonce: NONCE,
    task: "draft_review",
    profileId: "wording_support",
    admissionSnapshot: ADMISSION,
    redactedPreview: "[PERSON] fictional preview",
    minimizedTextBytes: 100,
    expiresAtMs: now + 60 * 60_000
  });
  assert.equal(Date.parse(session.expiresAt), now + 10 * 60_000);
  now -= 60 * 60_000;
  monotonicNow += 10 * 60_000;
  assert.equal(store.claim(session.reviewToken, "subject-alpha").status, "gone");

  const capacity = new T1EphemeralSessionStore({ maxSessions: 1, maxMinimizedTextBytes: 16 * 1024 * 1024 });
  capacity.create({
    ...CONSENT_BINDING,
    subject: "subject-alpha",
    internalNonce: NONCE,
    task: "draft_review",
    profileId: "structure_support",
    admissionSnapshot: ADMISSION,
    redactedPreview: "fictional",
    minimizedTextBytes: 16 * 1024 * 1024,
    expiresAtMs: Date.now() + 60_000
  });
  assert.throws(
    () =>
      capacity.create({
        ...CONSENT_BINDING,
        subject: "subject-beta",
        internalNonce: `sn_${"3".repeat(64)}`,
        task: "draft_review",
        profileId: "structure_support",
        admissionSnapshot: ADMISSION,
        redactedPreview: "fictional",
        minimizedTextBytes: 1,
        expiresAtMs: Date.now() + 60_000
      }),
    T1SessionCapacityError
  );
  assert.equal(capacity.stats().totalMinimizedTextBytes, 16 * 1024 * 1024);

  const replacement = new T1EphemeralSessionStore({
    maxSessions: 1,
    maxMinimizedTextBytes: 100
  });
  const retained = replacement.create({
    ...CONSENT_BINDING,
    subject: "subject-racing-prepare",
    internalNonce: `sn_${"4".repeat(64)}`,
    task: "draft_review",
    profileId: "structure_support",
    admissionSnapshot: ADMISSION,
    redactedPreview: "fictional",
    minimizedTextBytes: 90,
    expiresAtMs: Date.now() + 60_000
  });
  assert.throws(
    () =>
      replacement.create({
        ...CONSENT_BINDING,
        subject: "subject-racing-prepare",
        internalNonce: `sn_${"5".repeat(64)}`,
        task: "draft_review",
        profileId: "structure_support",
        admissionSnapshot: ADMISSION,
        redactedPreview: "fictional",
        minimizedTextBytes: 101,
        expiresAtMs: Date.now() + 60_000
      }),
    T1SessionCapacityError
  );
  assert.equal(replacement.claim(retained.reviewToken, "subject-racing-prepare").status, "ok");
  assert.deepEqual(replacement.stats(), {
    activeSessions: 1,
    totalMinimizedTextBytes: 90
  });

  const thousand = new T1EphemeralSessionStore();
  for (let index = 0; index < 1_000; index += 1) {
    thousand.create({
      ...CONSENT_BINDING,
      subject: `subject-${index}`,
      internalNonce: NONCE,
      task: "draft_review",
      profileId: "structure_support",
      admissionSnapshot: ADMISSION,
      redactedPreview: "fictional",
      minimizedTextBytes: Buffer.byteLength("fictional", "utf8"),
      expiresAtMs: Date.now() + 60_000
    });
  }
  assert.equal(thousand.stats().activeSessions, 1_000);
  assert.throws(
    () =>
      thousand.create({
        ...CONSENT_BINDING,
        subject: "subject-over-capacity",
        internalNonce: NONCE,
        task: "draft_review",
        profileId: "structure_support",
        admissionSnapshot: ADMISSION,
        redactedPreview: "fictional",
        minimizedTextBytes: Buffer.byteLength("fictional", "utf8"),
        expiresAtMs: Date.now() + 60_000
      }),
    T1SessionCapacityError
  );
  assert.equal(new T1EphemeralSessionStore().claim(session.reviewToken, "subject-alpha").status, "gone");
  store.dispose();
  capacity.dispose();
  replacement.dispose();
  thousand.dispose();
});

test("idle expiry timer removes session material without a later lookup", async () => {
  const store = new T1EphemeralSessionStore({ ttlMs: 10 });
  store.create({
    ...CONSENT_BINDING,
    subject: "subject-alpha",
    internalNonce: NONCE,
    task: "draft_review",
    profileId: "wording_support",
    admissionSnapshot: ADMISSION,
    redactedPreview: "A wholly fictional minimized preview.",
    minimizedTextBytes: 37,
    expiresAtMs: Date.now() + 60_000
  });
  const internals = store as unknown as { sessions: Map<string, unknown> };
  assert.equal(internals.sessions.size, 1);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(internals.sessions.size, 0);
  store.dispose();
});

test("simultaneous continue is claimed once and clear aborts in-flight work", async () => {
  const privateMock = createPrivateFetch({ holdContinue: true });
  const deps = dependencies();
  await withSyntheticApp(
    async (app) => {
      const review = T1UserDraftPrepareResponseSchema.parse(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).json()
      );
      const first = app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/continue",
        payload: { reviewToken: review.reviewToken, confirmed: true }
      });
      await new Promise((resolve) => setImmediate(resolve));
      const replay = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/continue",
        payload: { reviewToken: review.reviewToken, confirmed: true }
      });
      assert.equal(replay.statusCode, 410);
      const cleared = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/clear",
        payload: { reviewToken: review.reviewToken }
      });
      assert.equal(cleared.statusCode, 204);
      privateMock.releaseContinue();
      assert.equal((await first).statusCode, 503);
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission
      }
    }
  );
});

test("consent withdrawal while private prepare is blocked prevents session release and clears private state", async () => {
  const deps = dependencies();
  const sessions = new T1EphemeralSessionStore();
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  let markPrepareEntered!: () => void;
  let releasePrepare!: () => void;
  const prepareEntered = new Promise<void>((resolve) => {
    markPrepareEntered = resolve;
  });
  const prepareGate = new Promise<void>((resolve) => {
    releasePrepare = resolve;
  });
  const signalFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push({ url, body });
    if (url.endsWith("/prepare")) {
      markPrepareEntered();
      await prepareGate;
      return new Response(
        JSON.stringify({
          schema_version: "2.0.0",
          internal_nonce: NONCE,
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          redacted_preview: "A wholly fictional minimized preview.",
          potential_identifier_counts: {
            person_name: 0,
            location: 0,
            contact: 0,
            online_handle: 0,
            identifier: 0,
            other: 0
          },
          detector_version: DETECTOR,
          sanitized_text_bytes: 37,
          admission_snapshot: ADMISSION,
          limitation: T1PrivacyReviewLimitation
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.endsWith("/clear")) return new Response(null, { status: 204 });
    throw new Error("Unexpected private route in blocked-prepare fictional test.");
  };

  await withSyntheticApp(
    async (app) => {
      const preparing = app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload("A wholly fictional draft with enough words for local testing.")
      });
      await prepareEntered;
      await deps.consent.withdraw("subject-alpha");
      releasePrepare();

      const response = await preparing;
      assert.equal(response.statusCode, 403);
      assert.doesNotMatch(response.body, /rt_|sn_|Jordan|fictional minimized/i);
      assert.deepEqual(sessions.stats(), {
        activeSessions: 0,
        totalMinimizedTextBytes: 0
      });
      const clearRequests = requests.filter((entry) => entry.url.endsWith("/clear"));
      assert.equal(clearRequests.length, 1);
      assert.equal(clearRequests[0]?.body.internal_nonce, NONCE);
    },
    {
      signalEngine: t1Settings(),
      signalFetch,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission,
        sessionStore: sessions
      }
    }
  );
});

test("consent withdrawal after claim aborts before private analysis can release a result", async () => {
  const privateMock = createPrivateFetch();
  const deps = dependencies();
  let admissionCalls = 0;
  let releaseAdmission: (() => void) | undefined;
  let markAdmissionReached: (() => void) | undefined;
  const admissionReached = new Promise<void>((resolve) => {
    markAdmissionReached = resolve;
  });
  const admissionGate = new Promise<void>((resolve) => {
    releaseAdmission = resolve;
  });
  const gatedAdmission = {
    async current() {
      admissionCalls += 1;
      // Prepare performs three release-barrier checks; gate the continue check.
      if (admissionCalls === 4) {
        markAdmissionReached?.();
        await admissionGate;
      }
      return { admitted: true, snapshot: ADMISSION } as const;
    }
  };

  await withSyntheticApp(
    async (app) => {
      const review = T1UserDraftPrepareResponseSchema.parse(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/prepare",
          payload: preparePayload()
        })).json()
      );
      const continuing = app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/continue",
        payload: { reviewToken: review.reviewToken, confirmed: true }
      });
      await admissionReached;
      await deps.consent.withdraw("subject-alpha");
      releaseAdmission?.();
      const response = await continuing;
      assert.equal(response.statusCode, 503);
      assert.notDeepEqual(response.json(), validAnalysis);

      deps.consent.grant("subject-alpha");
      assert.equal(
        (await app.inject({
          method: "POST",
          url: "/api/v2/communication-analysis/user-draft/continue",
          payload: { reviewToken: review.reviewToken, confirmed: true }
        })).statusCode,
        410
      );
    },
    {
      signalEngine: t1Settings(),
      signalFetch: privateMock.fetchImpl,
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: gatedAdmission
      }
    }
  );
});

test("raw, identifier, token and exception canaries do not enter logs or generic errors", async () => {
  const deps = dependencies();
  const canary = "FictionalSecretPerson-DoNotLog-7391";
  const chunks: string[] = [];
  const stream = { write(chunk: unknown) { chunks.push(String(chunk)); } };
  await withSyntheticApp(
    async (app) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        payload: preparePayload(canary)
      });
      assert.equal(response.statusCode, 503);
      assert.deepEqual(response.json(), { error: "Privacy processing unavailable." });
      assert.doesNotMatch(response.body, new RegExp(canary));

      const malformed = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/user-draft/prepare",
        headers: { "content-type": "application/json" },
        payload: `{"draft":"${canary}`
      });
      assert.equal(malformed.statusCode, 400);
      assert.deepEqual(malformed.json(), { error: "Invalid request." });
      assert.equal(malformed.headers["cache-control"], "no-store, max-age=0");
      assert.doesNotMatch(malformed.body, new RegExp(canary));
    },
    {
      logger: { level: "trace", stream },
      signalEngine: t1Settings(),
      signalFetch: async () => {
        throw new Error(`${canary} internal model path /private/model`);
      },
      t1UserDraft: {
        authenticationProvider: deps.auth,
        consentProvider: deps.consent,
        privacyAdmissionProvider: deps.admission
      }
    }
  );
  assert.doesNotMatch(chunks.join(""), /FictionalSecretPerson|private\/model|user-draft/i);
});
