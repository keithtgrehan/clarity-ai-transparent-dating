#!/usr/bin/env node

import { failIfErrors, nonEmptyString, readYaml } from "./lib.mjs";

const { value: registry } = await readYaml("configs/training_source_registry.yml");
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

failIfErrors("Training source registry validation", errors);
