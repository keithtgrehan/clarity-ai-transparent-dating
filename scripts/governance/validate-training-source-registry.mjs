#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { failIfErrors, nonEmptyString, readYaml, repoRoot } from "./lib.mjs";

const { value: registry } = await readYaml("configs/training_source_registry.yml");
const { value: fixtureManifest } = await readYaml("configs/t1_fictional_fixture_manifest.yml");
const errors = [];

if (registry?.schemaVersion !== 1) errors.push("schemaVersion must equal 1.");
for (const key of ["owner", "lastReviewedAt", "milestone", "policy"]) {
  if (!nonEmptyString(registry?.[key])) errors.push(`${key} is required.`);
}

const falseDefaults = [
  "trainingAllowed",
  "benchmarkAllowed",
  "providerUploadAllowed",
  "rawStorageAllowed",
  "derivedArtifactAllowed",
  "commitAllowed",
  "quotingAllowed",
  "collectionAllowed",
  "tdmAuthorized"
];
if (registry?.defaults?.decision !== "blocked") errors.push("defaults.decision must be blocked.");
for (const key of falseDefaults) {
  if (registry?.defaults?.[key] !== false) errors.push(`defaults.${key} must be false.`);
}

if (JSON.stringify(registry?.currentUse?.allowedSourceIds) !== JSON.stringify(["clarity_authored_synthetic_fixtures"])) {
  errors.push("Only clarity_authored_synthetic_fixtures may be used in the current milestone.");
}
for (const key of [
  "trainingEnabled",
  "participantResearchEnabled",
  "publicScrapingEnabled",
  "privateDataEnabled",
  "audioEnabled"
]) {
  if (registry?.currentUse?.[key] !== false) errors.push(`currentUse.${key} must be false.`);
}

const requiredProhibitions = new Set([
  "diagnosis_or_neurotype_inference",
  "compatibility_or_relationship_outcome_prediction",
  "engagement_popularity_reply_delay_or_compulsion_optimization",
  "silent_service_to_training_reuse",
  "public_or_private_message_corpus_creation",
  "username_handle_quote_comment_post_thread_or_raw_transcript_storage",
  "emotion_or_neurotype_inference_from_voice"
]);
const prohibitions = new Set(registry?.globalProhibitions ?? []);
for (const value of requiredProhibitions) {
  if (!prohibitions.has(value)) errors.push(`globalProhibitions must include ${value}.`);
}

for (const gate of ["legalAndRights", "privacy", "researchEthicsAndHarm", "modelRisk"]) {
  if (registry?.reviewGates?.[gate]?.required !== true || !Array.isArray(registry?.reviewGates?.[gate]?.checks) || registry.reviewGates[gate].checks.length === 0) {
    errors.push(`reviewGates.${gate} must be required and contain checks.`);
  }
}

const sources = Array.isArray(registry?.sources) ? registry.sources : [];
if (sources.length === 0) errors.push("sources must be non-empty.");
const ids = new Set();
for (const [index, source] of sources.entries()) {
  const prefix = `sources[${index}]`;
  for (const key of ["sourceId", "sourceClass", "provenance", "rightsStatus", "personalDataRisk", "specialCategoryRisk", "currentDecision"]) {
    if (!nonEmptyString(source?.[key])) errors.push(`${prefix}.${key} is required.`);
  }
  if (ids.has(source?.sourceId)) errors.push(`${prefix}.sourceId is duplicated.`);
  ids.add(source?.sourceId);
  if (!Array.isArray(source?.allowedUses) || !Array.isArray(source?.prohibitedUses) || source.prohibitedUses.length === 0) {
    errors.push(`${prefix} must contain allowedUses and non-empty prohibitedUses lists.`);
  }
  if (source?.trainingAllowed !== false) errors.push(`${prefix}.trainingAllowed must be false.`);
  if (source?.sourceId !== "clarity_authored_synthetic_fixtures") {
    for (const key of ["rawStorageAllowed", "benchmarkAllowed"]) {
      if (source?.[key] !== false) errors.push(`${prefix}.${key} must be false outside the authored synthetic source.`);
    }
    if (source?.collectionAllowed !== undefined && source.collectionAllowed !== false) {
      errors.push(`${prefix}.collectionAllowed must be false when present.`);
    }
  } else {
    if (source?.currentDecision !== "allowed_bounded_use" || source?.commitAllowed !== true) {
      errors.push("The authored synthetic source must be bounded and explicitly committable.");
    }
    if (source?.benchmarkAllowed !== "synthetic_behavioral_only") {
      errors.push("Synthetic benchmark permission must remain synthetic_behavioral_only.");
    }
  }
}

for (const id of [
  "reddit_public_content",
  "youtube_comments",
  "public_forums_support_groups_and_blogs",
  "consented_participant_text",
  "private_whatsapp_or_chat_export",
  "real_audio_or_voice"
]) {
  const source = sources.find((item) => item?.sourceId === id);
  if (!source) {
    errors.push(`Required high-risk source class ${id} is missing.`);
  } else if (!new Set(["prohibited", "schema_and_reviewer_process_reference_only"]).has(source.currentDecision)) {
    errors.push(`${id} must remain prohibited or process-reference-only.`);
  }
}

if (!Array.isArray(registry?.legalReferences) || registry.legalReferences.length < 2) {
  errors.push("At least GDPR and UrhG legal references are required.");
}

const expectedFixturePath = "services/signal-engine/tests/fixtures/t1_pii_benchmark.json";
const fixtureBytes = await readFile(resolve(repoRoot, expectedFixturePath));
const fixture = JSON.parse(fixtureBytes.toString("utf8"));
const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
if (
  fixtureManifest?.schemaVersion !== 1 ||
  fixtureManifest?.sourceId !== "clarity_authored_synthetic_fixtures" ||
  fixtureManifest?.ownerAuthorization?.decisionId !== "D020"
) {
  errors.push("T1 fictional fixture manifest must bind schema v1, the authored source and D020.");
}
if (
  fixtureManifest?.generation?.externalSourceTextUsed !== false ||
  fixtureManifest?.generation?.privateSourceTextUsed !== false ||
  fixtureManifest?.generation?.participantSourceTextUsed !== false ||
  fixtureManifest?.generation?.publicPlatformSourceTextUsed !== false ||
  fixtureManifest?.generation?.modelArtifactUsed !== false ||
  !nonEmptyString(fixtureManifest?.generation?.method) ||
  !nonEmptyString(fixtureManifest?.generation?.tool) ||
  !nonEmptyString(fixtureManifest?.generation?.modelIdentifier)
) {
  errors.push("T1 fictional fixture generation must be identified and exclude every external/private source class and model artifact.");
}
if (
  fixtureManifest?.copiedSourceExclusion?.copiedOrParaphrasedRows !== false ||
  fixtureManifest?.copiedSourceExclusion?.donorFixtureRowsUsed !== false ||
  fixtureManifest?.copiedSourceExclusion?.publicOrPrivateExamplesUsed !== false
) {
  errors.push("T1 fictional fixture manifest must exclude copied, donor, public and private rows.");
}
if (
  fixtureManifest?.review?.independentReviewStatus !== "passed_before_commit" ||
  fixtureManifest?.review?.humanOwnerReviewStatus !== "required_before_merge" ||
  fixtureManifest?.review?.realisticIdentifierReview !==
    "passed_no_realistic_contact_location_or_health_details" ||
  !Array.isArray(fixtureManifest?.review?.reviewerRoles) ||
  fixtureManifest.review.reviewerRoles.length < 2
) {
  errors.push("T1 fictional fixture requires independent review and explicit human-owner review before merge.");
}
if (
  fixtureManifest?.fixture?.path !== expectedFixturePath ||
  fixtureManifest?.fixture?.sha256 !== fixtureSha256 ||
  fixtureManifest?.fixture?.caseCount !== fixture?.cases?.length ||
  !nonEmptyString(fixtureManifest?.fixture?.split) ||
  fixture?.content_class !== "wholly_fictional_t1_pii_benchmark"
) {
  errors.push("T1 fictional fixture path, hash, count, split and content class must match its manifest.");
}
for (const [key, expected] of Object.entries({
  benchmarkAllowed: "synthetic_behavioral_only",
  trainingAllowed: false,
  participantUseAllowed: false,
  productionUseAllowed: false,
  realWorldAccuracyClaimAllowed: false,
  modelApprovalClaimAllowed: false
})) {
  if (fixtureManifest?.permission?.[key] !== expected) {
    errors.push(`T1 fictional fixture permission.${key} must equal ${JSON.stringify(expected)}.`);
  }
}

failIfErrors("Training source registry validation", errors);
