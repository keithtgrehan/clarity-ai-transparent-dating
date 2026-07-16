import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CommunicationAnalysisRequestSchema,
  CommunicationAnalysisResponseSchema,
  CommunicationAnalysisCueCopy,
  CommunicationAnalysisLimitations,
  type CommunicationAnalysisResponse
} from "@clarity/shared";
import { readStore } from "../src/lib/store.js";
import { resolveRepoPath } from "../src/lib/paths.js";
import {
  readSignalEngineSettings,
  resolveApiListenHostForSignalReview,
  type SignalEngineSettings
} from "../src/services/signal/settings.js";
import {
  createInitialSignalReviewState,
  isSignalEngineUiEnabled,
  SIGNAL_REVIEW_COPY,
  signalReviewReducer
} from "../../web/src/pages/signalReviewModel.js";
import { withSyntheticApp } from "./helpers.js";

const internalSecret = "synthetic-test-secret-that-is-longer-than-32-characters";

function enabledSettings(overrides: Partial<SignalEngineSettings> = {}): SignalEngineSettings {
  return {
    enabled: true,
    syntheticOnly: true,
    t1ProtocolEnabled: false,
    userAuthoredText: false,
    receivedExcerpts: false,
    audioEnabled: false,
    modelTrainingEnabled: false,
    localAuthBypass: false,
    appEnvironment: "test",
    internalUrl: "http://127.0.0.1:8091",
    internalSecret,
    timeoutMs: 1_000,
    rateLimitMax: 20,
    rateLimitWindowMs: 60_000,
    ...overrides
  };
}

function disabledSettings(): SignalEngineSettings {
  return {
    ...enabledSettings(),
    enabled: false,
    syntheticOnly: false,
    internalUrl: null,
    internalSecret: null
  };
}

const validAnalysis: CommunicationAnalysisResponse = {
  schema_version: "1.0.0",
  analysis_id: "an_0123456789abcdef01234567",
  low_signal: false,
  privacy_receipt: {
    method: "deterministic_patterns_synthetic_fixture_only",
    redaction_counts: {
      person_name: 0,
      location: 0,
      contact: 0,
      online_handle: 0,
      identifier: 0,
      other: 0
    },
    redaction_total: 0,
    local_ner_status: "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY",
    text_released: false,
    text_persisted: false,
    limitation: "This tracked fictional fixture received deterministic identifier-pattern checks only; this is not evidence of real-text anonymisation."
  },
  cues: [
    {
      canonical_id: "communication.repair",
      observation: CommunicationAnalysisCueCopy["communication.repair"].observation,
      limitation: CommunicationAnalysisCueCopy["communication.repair"].limitation,
      sanitized_range: { start: 0, end: 20 },
      evidence_sufficiency: "deterministic"
    }
  ],
  repair_action: {
    ...CommunicationAnalysisCueCopy["communication.repair"].repair_action
  },
  limitations: [...CommunicationAnalysisLimitations],
  provenance: {
    engine_version: "0.1.0",
    ruleset_version: "2026-07-15.1",
    cue_registry_version: "1.0.0",
    semantic_model_id: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    semantic_model_revision: "e8f8c211226b894fcb81acc59f3b34ba3efd5f42",
    semantic_status: "abstain_model_not_local"
  }
};

test("signal settings are default-deny and reject every unsafe gate combination", () => {
  const defaults = readSignalEngineSettings({ APP_ENV: "local" });
  assert.equal(defaults.enabled, false);
  assert.equal(defaults.syntheticOnly, true);
  assert.equal(resolveApiListenHostForSignalReview(defaults), "0.0.0.0");
  assert.equal(resolveApiListenHostForSignalReview(enabledSettings()), "127.0.0.1");

  for (const name of [
    "SIGNAL_ENGINE_USER_AUTHORED_TEXT",
    "SIGNAL_ENGINE_RECEIVED_EXCERPTS",
    "SIGNAL_ENGINE_AUDIO",
    "SIGNAL_ENGINE_SYNTHETIC_TRAINING",
    "SIGNAL_ENGINE_REAL_DATA_TRAINING",
    "SIGNAL_ENGINE_PRODUCTION"
  ]) {
    assert.throws(
      () => readSignalEngineSettings({ APP_ENV: "local", [name]: "true" }),
      /Prohibited signal-engine gates/
    );
  }

  assert.throws(
    () =>
      readSignalEngineSettings({
        APP_ENV: "local",
        SIGNAL_ENGINE_ENABLED: "true",
        SIGNAL_ENGINE_SYNTHETIC_ONLY: "false"
      }),
    /SYNTHETIC_ONLY=true/
  );
  assert.throws(
    () =>
      readSignalEngineSettings({
        APP_ENV: "production",
        SIGNAL_ENGINE_ENABLED: "true",
        SIGNAL_ENGINE_SYNTHETIC_ONLY: "true",
        SIGNAL_ENGINE_INTERNAL_URL: "http://127.0.0.1:8091",
        SIGNAL_ENGINE_INTERNAL_SECRET: internalSecret
      }),
    /local or test/
  );
  assert.throws(
    () =>
      readSignalEngineSettings({
        APP_ENV: "local",
        SIGNAL_ENGINE_ENABLED: "true",
        SIGNAL_ENGINE_SYNTHETIC_ONLY: "true",
        SIGNAL_ENGINE_INTERNAL_URL: "https://example.test",
        SIGNAL_ENGINE_INTERNAL_SECRET: internalSecret
      }),
    /loopback/
  );
  assert.throws(
    () =>
      readSignalEngineSettings({
        APP_ENV: "local",
        SIGNAL_ENGINE_ENABLED: "true",
        SIGNAL_ENGINE_SYNTHETIC_ONLY: "true",
        SIGNAL_ENGINE_INTERNAL_URL: "http://127.0.0.1:8091/private-base",
        SIGNAL_ENGINE_INTERNAL_SECRET: internalSecret
      }),
    /application path/
  );
  assert.throws(
    () => readSignalEngineSettings({ APP_ENV: "local", SIGNAL_ENGINE_ENABLED: "yes" }),
    /exactly true or false/
  );
});

test("the v2 route is absent while the server-side feature flag is false", async () => {
  await withSyntheticApp(async (app) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v2/communication-analysis/text",
      payload: {
        fixtureId: "wording_us_direct",
        task: "draft_review",
        profileId: "wording_support",
        redactionReviewConfirmed: true
      }
    });
    assert.equal(response.statusCode, 404);
  }, { signalEngine: disabledSettings() });
});

test("the adapter resolves only tracked text, authenticates loopback, validates output and persists nothing", async () => {
  let outboundUrl = "";
  let outboundInit: RequestInit | undefined;
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    outboundUrl = input.toString();
    outboundInit = init;
    return new Response(JSON.stringify(validAnalysis), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  await withSyntheticApp(async (app) => {
    const before = await readStore();
    const response = await app.inject({
      method: "POST",
      url: "/api/v2/communication-analysis/text",
      payload: {
        fixtureId: "wording_gb_repair",
        task: "message_excerpt_review",
        profileId: "wording_support",
        redactionReviewConfirmed: true
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.headers.pragma, "no-cache");
    assert.deepEqual(response.json(), validAnalysis);
    assert.deepEqual(await readStore(), before);
    assert.equal(outboundUrl, "http://127.0.0.1:8091/internal/v1/communication-analysis/text");
    assert.equal(new Headers(outboundInit?.headers).get("x-internal-service-secret"), internalSecret);
    assert.equal(outboundInit?.redirect, "error");

    const outboundBody = JSON.parse(String(outboundInit?.body));
    assert.deepEqual(Object.keys(outboundBody).sort(), [
      "authority",
      "fixture_id",
      "language_tag",
      "profile_id",
      "task",
      "text"
    ]);
    assert.equal(outboundBody.fixture_id, "wording_gb_repair");
    assert.equal(outboundBody.language_tag, "en-GB");
    assert.equal(
      outboundBody.text,
      "I think my earlier note was unclear. What I meant was: maybe we could meet on Saturday afternoon, if that is okay."
    );
    assert.deepEqual(outboundBody.authority, {
      source_class: "synthetic_fixture",
      review_confirmed: true
    });
    assert.doesNotMatch(response.body, /I think my earlier note was unclear\. What I meant was/);
    assert.doesNotMatch(response.body, /synthetic-test-secret/);
  }, { signalEngine: enabledSettings(), signalFetch: fetchImpl });
});

test("arbitrary text, identity, audio, unconfirmed review and extra fields are rejected before proxying", async () => {
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    return new Response(JSON.stringify(validAnalysis));
  };

  const valid = {
    fixtureId: "wording_us_direct",
    task: "draft_review",
    profileId: "wording_support",
    redactionReviewConfirmed: true
  };
  const invalidPayloads = [
    { ...valid, text: "arbitrary message" },
    { ...valid, userId: "user-you" },
    { ...valid, audio: "voice.wav" },
    { ...valid, redactionReviewConfirmed: false },
    { ...valid, fixtureId: "unknown_fixture" },
    { ...valid, task: "message_excerpt_review" }
  ];

  await withSyntheticApp(async (app) => {
    for (const payload of invalidPayloads) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/text",
        payload
      });
      assert.equal(response.statusCode, 400);
      assert.deepEqual(response.json(), { error: "Invalid synthetic analysis request." });
      assert.equal(response.headers["cache-control"], "no-store");
    }

    const oversized = await app.inject({
      method: "POST",
      url: "/api/v2/communication-analysis/text",
      payload: { ...valid, text: "x".repeat(3_000) }
    });
    assert.equal(oversized.statusCode, 413);
    assert.equal(oversized.headers["cache-control"], "no-store");
    assert.doesNotMatch(oversized.body, /x{100}/);
    assert.equal(fetchCount, 0);
  }, { signalEngine: enabledSettings(), signalFetch: fetchImpl });
});

test("invalid upstream output fails closed and rate limiting stores no requester identity", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ ...validAnalysis, source_text: "must never pass" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  const payload = {
    fixtureId: "wording_us_direct",
    task: "draft_review",
    profileId: "structure_support",
    redactionReviewConfirmed: true
  };

  await withSyntheticApp(async (app) => {
    const invalid = await app.inject({
      method: "POST",
      url: "/api/v2/communication-analysis/text",
      payload
    });
    assert.equal(invalid.statusCode, 503);
    assert.deepEqual(invalid.json(), { error: "Synthetic analysis is temporarily unavailable." });

    const limited = await app.inject({
      method: "POST",
      url: "/api/v2/communication-analysis/text",
      payload
    });
    assert.equal(limited.statusCode, 429);
    assert.deepEqual(limited.json(), { error: "Synthetic analysis rate limit reached." });
  }, {
    signalEngine: enabledSettings({ rateLimitMax: 1 }),
    signalFetch: fetchImpl
  });
});

test("signal route logs never contain text, headers, the service secret, or parser canaries", async () => {
  const logChunks: string[] = [];
  const logStream = {
    write(chunk: string) {
      logChunks.push(chunk);
    }
  };
  let failUpstream = false;
  const fetchImpl = async () => {
    if (failUpstream) throw new Error(`private upstream failure ${internalSecret}`);
    return new Response(JSON.stringify(validAnalysis), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  const valid = {
    fixtureId: "wording_us_direct",
    task: "draft_review",
    profileId: "wording_support",
    redactionReviewConfirmed: true
  };
  const privateHeaderCanary = "PRIVATE_HEADER_CANARY_91e8";
  const arbitraryRawCanary = "ARBITRARY_RAW_CANARY_44ac";
  const malformedCanary = "MALFORMED_JSON_CANARY_0f7d";

  await withSyntheticApp(async (app) => {
    const headers = { "X-Test-Private-Header": privateHeaderCanary };

    assert.equal(
      (await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/text",
        headers,
        payload: valid
      })).statusCode,
      200
    );
    assert.equal(
      (await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/text",
        headers,
        payload: { ...valid, text: arbitraryRawCanary }
      })).statusCode,
      400
    );
    assert.equal(
      (await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/text",
        headers: { ...headers, "content-type": "application/json" },
        payload: `{"fixtureId":"${malformedCanary}"`
      })).statusCode,
      400
    );
    assert.equal(
      (await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/text",
        headers,
        payload: { ...valid, text: arbitraryRawCanary.repeat(300) }
      })).statusCode,
      413
    );

    failUpstream = true;
    assert.equal(
      (await app.inject({
        method: "POST",
        url: "/api/v2/communication-analysis/text",
        headers,
        payload: valid
      })).statusCode,
      503
    );
  }, {
    logger: { level: "trace", stream: logStream },
    signalEngine: enabledSettings(),
    signalFetch: fetchImpl
  });

  const logs = logChunks.join("");
  assert.doesNotMatch(logs, /communication-analysis|remoteAddress|remotePort/i);
  for (const canary of [
    "I would like to meet on Saturday afternoon.",
    arbitraryRawCanary,
    malformedCanary,
    privateHeaderCanary,
    internalSecret
  ]) {
    assert.doesNotMatch(logs, new RegExp(canary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("closed contracts enforce fixture/task pairs, bounded cues and low-signal abstention", () => {
  assert.equal(
    CommunicationAnalysisRequestSchema.safeParse({
      fixtureId: "wording_gb_repair",
      task: "message_excerpt_review",
      profileId: "structure_support",
      redactionReviewConfirmed: true
    }).success,
    true
  );
  assert.equal(
    CommunicationAnalysisRequestSchema.safeParse({
      fixtureId: "wording_gb_repair",
      task: "draft_review",
      profileId: "structure_support",
      redactionReviewConfirmed: true
    }).success,
    false
  );
  assert.equal(
    CommunicationAnalysisResponseSchema.safeParse({
      ...validAnalysis,
      cues: [{ ...validAnalysis.cues[0], canonical_id: "deprecated.request_stacking" }]
    }).success,
    false
  );
  assert.equal(
    CommunicationAnalysisResponseSchema.safeParse({ ...validAnalysis, cues: [] }).success,
    false
  );

  const fourCues = { ...validAnalysis, cues: Array.from({ length: 4 }, () => validAnalysis.cues[0]) };
  assert.equal(CommunicationAnalysisResponseSchema.safeParse(fourCues).success, false);
  assert.equal(
    CommunicationAnalysisResponseSchema.safeParse({
      ...validAnalysis,
      cues: [validAnalysis.cues[0], validAnalysis.cues[0]]
    }).success,
    false
  );
  assert.equal(
    CommunicationAnalysisResponseSchema.safeParse({
      ...validAnalysis,
      low_signal: true,
      cues: [],
      repair_action: null
    }).success,
    true
  );
  assert.equal(
    CommunicationAnalysisResponseSchema.safeParse({ ...validAnalysis, low_signal: true }).success,
    false
  );
  assert.equal(
    CommunicationAnalysisResponseSchema.safeParse({
      ...validAnalysis,
      raw_text: "forbidden"
    }).success,
    false
  );
});

test("every upstream string field is exact canonical copy and rejects PII canaries", () => {
  const canary =
    "Jordan Example jordan@example.test +49 30 1234 5678 DE89 3704 0044 0532 0130 00 198.51.100.23 12 Example Street";
  const cue = validAnalysis.cues[0];
  const repair = validAnalysis.repair_action;
  assert.ok(cue);
  assert.ok(repair);

  const mutations: unknown[] = [
    { ...validAnalysis, analysis_id: canary },
    { ...validAnalysis, cues: [{ ...cue, observation: canary }] },
    { ...validAnalysis, cues: [{ ...cue, limitation: canary }] },
    { ...validAnalysis, repair_action: { ...repair, title: canary } },
    { ...validAnalysis, repair_action: { ...repair, editable_text: canary } },
    { ...validAnalysis, repair_action: { ...repair, rationale: canary } },
    { ...validAnalysis, limitations: [canary, ...validAnalysis.limitations.slice(1)] },
    {
      ...validAnalysis,
      privacy_receipt: { ...validAnalysis.privacy_receipt, limitation: canary }
    },
    {
      ...validAnalysis,
      provenance: { ...validAnalysis.provenance, engine_version: canary }
    },
    {
      ...validAnalysis,
      provenance: { ...validAnalysis.provenance, ruleset_version: canary }
    },
    {
      ...validAnalysis,
      provenance: { ...validAnalysis.provenance, cue_registry_version: canary }
    },
    {
      ...validAnalysis,
      provenance: { ...validAnalysis.provenance, semantic_model_id: canary }
    },
    {
      ...validAnalysis,
      provenance: { ...validAnalysis.provenance, semantic_model_revision: canary }
    }
  ];

  for (const mutation of mutations) {
    assert.equal(CommunicationAnalysisResponseSchema.safeParse(mutation).success, false);
  }
});

test("server fixture hashes stay aligned with the governed synthetic allowlist", async () => {
  const registry = await readFile(
    resolveRepoPath("configs/signal_synthetic_fixture_hashes.yml"),
    "utf8"
  );
  for (const [fixtureId, hash] of Object.entries({
    wording_us_direct: "867f38da20f6783e2c49186d2a0bb8f4271c8135cc7a2f22528919859d9aafe1",
    wording_gb_repair: "efda7e14c6854c8208bbe9e8db127119967ab690b1f3ff941b443fa308be4f89",
    structure_eu_transition: "7036a4895fc20cbb229d752e7b8e8bd597de66ac0c09593b850d26983534aa1e",
    low_signal_greeting: "23ea498e82f4435b1c135324eedef4ba64061600897077bf76082a50b41a9c13"
  })) {
    assert.match(registry, new RegExp(`${fixtureId}:[\\s\\S]{0,120}${hash}`));
  }
});

test("the real Python contract fixture is accepted by the exact Fastify schema", async () => {
  const fixture = JSON.parse(
    await readFile(
      resolveRepoPath(
        "services/signal-engine/tests/fixtures/fastify_fastapi_contract_response.json"
      ),
      "utf8"
    )
  );
  assert.equal(CommunicationAnalysisResponseSchema.safeParse(fixture).success, true);
});

test("the UI state machine requires confirmation, keeps one editable action in memory and clears it", () => {
  let state = createInitialSignalReviewState();
  assert.equal(state.redactionReviewConfirmed, false);
  assert.equal(signalReviewReducer(state, { type: "start" }), state);

  state = signalReviewReducer(state, { type: "confirm_review", value: true });
  state = signalReviewReducer(state, { type: "start" });
  assert.equal(state.phase, "loading");
  state = signalReviewReducer(state, {
    type: "succeed",
    value: validAnalysis,
    revision: state.requestRevision
  });
  assert.equal(state.phase, "result");
  assert.equal(state.analysis?.cues.length, 1);
  assert.equal(state.editableRepairText, validAnalysis.repair_action?.editable_text);

  state = signalReviewReducer(state, { type: "edit_repair", value: "A local edit." });
  assert.equal(state.editableRepairText, "A local edit.");
  state = signalReviewReducer(state, { type: "select_profile", value: "structure_support" });
  assert.equal(state.redactionReviewConfirmed, false);
  assert.equal(state.analysis, null);
  assert.equal(state.editableRepairText, "");

  state = signalReviewReducer(state, { type: "confirm_review", value: true });
  state = signalReviewReducer(state, { type: "select_task", value: "message_excerpt_review" });
  assert.equal(state.redactionReviewConfirmed, false);
  assert.equal(state.fixtureId, "wording_gb_repair");

  state = signalReviewReducer(state, { type: "confirm_review", value: true });
  state = signalReviewReducer(state, { type: "select_fixture", value: "low_signal_greeting" });
  assert.equal(state.redactionReviewConfirmed, false);
  assert.equal(state.task, "draft_review");

  state = signalReviewReducer(state, { type: "clear" });
  assert.equal(state.analysis, null);
  assert.equal(state.editableRepairText, "");
  assert.equal(state.redactionReviewConfirmed, false);

  state = signalReviewReducer(state, { type: "confirm_review", value: true });
  state = signalReviewReducer(state, { type: "start" });
  const staleRevision = state.requestRevision;
  state = signalReviewReducer(state, { type: "select_profile", value: "structure_support" });
  const reconfigured = state;
  state = signalReviewReducer(state, {
    type: "succeed",
    value: validAnalysis,
    revision: staleRevision
  });
  assert.equal(state, reconfigured);
  assert.equal(state.analysis, null);

  state = signalReviewReducer(state, { type: "confirm_review", value: true });
  state = signalReviewReducer(state, { type: "start" });
  const withdrawnRevision = state.requestRevision;
  state = signalReviewReducer(state, { type: "confirm_review", value: false });
  const withdrawn = state;
  state = signalReviewReducer(state, {
    type: "succeed",
    value: validAnalysis,
    revision: withdrawnRevision
  });
  assert.equal(state, withdrawn);
  assert.equal(state.analysis, null);

  state = signalReviewReducer(state, { type: "confirm_review", value: true });
  state = signalReviewReducer(state, { type: "start" });
  const clearedRevision = state.requestRevision;
  state = signalReviewReducer(state, { type: "clear" });
  const cleared = state;
  state = signalReviewReducer(state, {
    type: "succeed",
    value: validAnalysis,
    revision: clearedRevision
  });
  assert.equal(state, cleared);
  assert.equal(state.analysis, null);

  assert.equal(isSignalEngineUiEnabled(undefined, true), false);
  assert.equal(isSignalEngineUiEnabled("false", true), false);
  assert.equal(isSignalEngineUiEnabled("true", false), false);
  assert.equal(isSignalEngineUiEnabled("true", true), true);
  assert.match(SIGNAL_REVIEW_COPY.confirmation, /fictional preview.*synthetic only/i);
  assert.match(SIGNAL_REVIEW_COPY.editNote, /never submitted or saved/i);
});

test("the gated UI contains no real-input, upload, persistence, analytics or compulsion surface", async () => {
  const page = await readFile(resolveRepoPath("apps/web/src/pages/SignalReviewPage.tsx"), "utf8");
  const model = await readFile(resolveRepoPath("apps/web/src/pages/signalReviewModel.ts"), "utf8");
  const styles = await readFile(resolveRepoPath("apps/web/src/styles/global.css"), "utf8");
  const environment = await readFile(resolveRepoPath(".env.example"), "utf8");

  assert.doesNotMatch(page, /type=["'](?:file|text)["']|localStorage|sessionStorage|analytics/i);
  assert.doesNotMatch(`${page}\n${model}`, /streak|urgenc|dopamine|guilt/i);
  assert.match(page, /privacy_receipt\.local_ner_status/);
  assert.match(page, /privacy_receipt\.method/);
  assert.match(page, /privacy_receipt\.limitation/);
  assert.match(page, /potential pattern\(s\) replaced/i);
  assert.doesNotMatch(page, /identifier item\(s\)\s+removed/i);
  assert.match(page, /no free-text, upload, audio, or paste field/i);
  assert.match(page, /Potential-identifier simulation/);
  assert.match(page, /AbortController/);
  assert.match(page, /aria-live/);
  assert.match(page, /tabIndex=\{-1\}/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(environment, /VITE_SIGNAL_ENGINE_ENABLED=false/);
  assert.match(environment, /^SIGNAL_ENGINE_SYNTHETIC_ONLY=true$/m);
  for (const flag of [
    "SIGNAL_ENGINE_ENABLED",
    "SIGNAL_ENGINE_T1_PROTOCOL_ENABLED",
    "SIGNAL_ENGINE_T1_LOCAL_AUTH_BYPASS",
    "SIGNAL_ENGINE_USER_AUTHORED_TEXT",
    "SIGNAL_ENGINE_RECEIVED_EXCERPTS",
    "SIGNAL_ENGINE_AUDIO",
    "SIGNAL_ENGINE_MODEL_TRAINING",
    "SIGNAL_ENGINE_SYNTHETIC_TRAINING",
    "SIGNAL_ENGINE_REAL_DATA_TRAINING",
    "SIGNAL_ENGINE_PRODUCTION"
  ]) {
    assert.match(environment, new RegExp(`^${flag}=false$`, "m"));
  }
});
