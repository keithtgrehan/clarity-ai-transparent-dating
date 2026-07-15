#!/usr/bin/env node

import { failIfErrors, isObject, nonEmptyString, readYaml } from "./lib.mjs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { repoRoot } from "./lib.mjs";

const errors = [];
const cueDocument = (await readYaml("configs/cue_registry_v1.yml")).value;
const modelDocument = (await readYaml("configs/model_inventory.yml")).value;
const characterization = JSON.parse(
  await readFile(resolve(repoRoot, "services/signal-engine/tests/fixtures/dating_signal_cases.json"), "utf8")
);

const exactRulePolicy = {
  "communication.directness": ["first_person_preference_or_explicit_request", ["minimum_signal"]],
  "communication.ambiguity": ["ambiguity_marker_count", ["minimum_signal"]],
  "communication.pressure": ["second_person_obligation_or_urgency", ["minimum_signal"]],
  "communication.reassurance_request": ["reassurance_question", ["minimum_signal"]],
  "communication.reassurance_repetition": ["repeated_reassurance_question", ["two_reassurance_requests"]],
  "communication.repair": ["explicit_repair_marker", ["minimum_signal"]],
  "structure.explicit_transition": ["transition_marker", ["minimum_signal"]],
  "structure.high_lexical_density": ["lexical_density_threshold", ["at_least_40_tokens"]],
  "structure.long_information_run": ["long_comma_separated_run", ["at_least_45_tokens"]],
  "structure.processing_request": ["processing_time_phrase", ["minimum_signal"]],
  "structure.response_window_present": ["processing_request_with_time_window", ["processing_request"]],
  "structure.response_window_missing": ["processing_request_without_time_window", ["processing_request", "no_time_window"]],
  "structure.thinking_aloud": ["thinking_aloud_marker", ["minimum_signal"]],
  "structure.final_position": ["final_position_marker", ["minimum_signal"]],
  "structure.reciprocity_offer": ["short_version_offer", ["minimum_signal"]],
  "structure.channel_switch_offer": ["channel_choice_phrase", ["minimum_signal"]],
  "structure.multi_request_load": ["question_count_threshold", ["three_questions"]]
};

const isSha256 = (value) => /^[0-9a-f]{64}$/i.test(value ?? "");
const isCommit = (value) => /^[0-9a-f]{40}$/i.test(value ?? "");
const arrayOfStrings = (value) => Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);

if (cueDocument?.schema_version !== "1.0.0") errors.push("cue registry schema_version must be 1.0.0.");
if (!nonEmptyString(cueDocument?.ruleset_version)) errors.push("cue registry ruleset_version is required.");

const profiles = new Set(cueDocument?.profiles ?? []);
if (profiles.size === 0 || profiles.size !== (cueDocument?.profiles ?? []).length) {
  errors.push("cue registry profiles must be a non-empty unique list.");
}

const cues = Array.isArray(cueDocument?.cues) ? cueDocument.cues : [];
if (cues.length === 0) errors.push("cue registry must contain cues.");
const canonicalIds = new Set(cues.map((cue) => cue?.canonical_id).filter(nonEmptyString));
if (canonicalIds.size !== cues.length) errors.push("cue canonical IDs must be present and unique.");

const activeNames = new Map();
const prohibitedObservation = /\b(?:diagnos(?:is|e)|autis(?:m|tic)|ADHD|AuDHD|emotion|attraction|compatib(?:le|ility)|deception|motive|intent|confidence|cognitive state|neurotype|relationship success)\b/i;
for (const [index, cue] of cues.entries()) {
  const prefix = `cues[${index}]`;
  for (const key of ["canonical_id", "deterministic_rule", "safe_observation", "limits", "repair_action", "status"]) {
    if (!nonEmptyString(cue?.[key])) errors.push(`${prefix}.${key} is required.`);
  }
  for (const key of ["aliases", "profiles", "preconditions", "language_support", "tests"]) {
    if (!arrayOfStrings(cue?.[key])) errors.push(`${prefix}.${key} must be a non-empty string list.`);
  }
  if (!Number.isInteger(cue?.priority) || cue.priority < 0 || cue.priority > 1000) {
    errors.push(`${prefix}.priority must be an integer between 0 and 1000.`);
  }
  if (cue?.status !== "active") errors.push(`${prefix}.status must be active in registry v1.`);
  for (const profile of cue?.profiles ?? []) {
    if (!profiles.has(profile)) errors.push(`${prefix}.profiles references unknown profile ${profile}.`);
  }
  if (prohibitedObservation.test(cue?.safe_observation ?? "")) {
    errors.push(`${prefix}.safe_observation contains prohibited person-level inference language.`);
  }
  if (prohibitedObservation.test(cue?.repair_action ?? "")) {
    errors.push(`${prefix}.repair_action contains prohibited person-level inference language.`);
  }
  for (const name of [cue?.canonical_id, ...(cue?.aliases ?? [])]) {
    if (!nonEmptyString(name)) continue;
    if (activeNames.has(name)) errors.push(`${prefix} name ${name} collides with ${activeNames.get(name)}.`);
    activeNames.set(name, cue?.canonical_id);
  }
  const expectedRule = exactRulePolicy[cue?.canonical_id];
  if (
    !expectedRule ||
    cue?.deterministic_rule !== expectedRule[0] ||
    JSON.stringify(cue?.preconditions) !== JSON.stringify(expectedRule[1])
  ) {
    errors.push(`${prefix} rule/preconditions differ from the executable v1 policy.`);
  }
}

const cases = Array.isArray(characterization?.cases) ? characterization.cases : [];
if (characterization?.provenance?.donor_source_sha256 !== "c7af85f4cce2b2fa9d11da894f7e93021c074caf9ce7e752847bb0ded791a5e0") {
  errors.push("dating characterization fixture must identify the approved donor snapshot.");
}
const caseIds = new Set(cases.map((entry) => entry?.fixture_id).filter(nonEmptyString));
const expectedCueIds = new Set(
  cases.flatMap((entry) => Array.isArray(entry?.expected_canonical_ids) ? entry.expected_canonical_ids : [])
);
for (const cue of cues) {
  for (const testId of cue?.tests ?? []) {
    if (!caseIds.has(testId)) errors.push(`${cue.canonical_id} references missing governed case ${testId}.`);
  }
}
for (const cueId of canonicalIds) {
  if (!expectedCueIds.has(cueId)) errors.push(`${cueId} has no positive governed characterization case.`);
}
for (const cueId of expectedCueIds) {
  if (!canonicalIds.has(cueId)) errors.push(`characterization fixture expects unknown cue ${cueId}.`);
}

if (!isObject(cueDocument?.deprecated_aliases)) {
  errors.push("deprecated_aliases must be an explicit mapping.");
} else {
  for (const [alias, target] of Object.entries(cueDocument.deprecated_aliases)) {
    if (!nonEmptyString(alias) || !nonEmptyString(target)) errors.push("deprecated aliases and targets must be strings.");
    if (alias === target) errors.push(`deprecated alias ${alias} is a self-cycle.`);
    if (activeNames.has(alias) || canonicalIds.has(alias)) errors.push(`deprecated alias ${alias} collides with an active name.`);
    if (!canonicalIds.has(target)) errors.push(`deprecated alias ${alias} targets unknown cue ${target}.`);
    if (Object.hasOwn(cueDocument.deprecated_aliases, target)) errors.push(`deprecated alias ${alias} forms a chain or cycle through ${target}.`);
  }
}

for (const [requiredAlias, target] of Object.entries({
  cognitive_load: "structure.multi_request_load",
  cognitive_load_proxy: "structure.multi_request_load",
  request_stacking: "structure.multi_request_load",
  pressure_language: "communication.pressure",
  repair_attempt: "communication.repair",
  repair_opportunity: "communication.repair",
  linear_narrative_break: "structure.explicit_transition",
  topic_shift: "structure.explicit_transition"
})) {
  if (cueDocument?.deprecated_aliases?.[requiredAlias] !== target) {
    errors.push(`${requiredAlias} must map explicitly to ${target}.`);
  }
}

if (modelDocument?.schema_version !== "1.0.0") errors.push("model inventory schema_version must be 1.0.0.");
const policy = modelDocument?.runtime_policy;
for (const [key, expected] of Object.entries({
  network_downloads: false,
  model_execution: false,
  local_files_only: true,
  trust_remote_code: false,
  telemetry: false,
  optional_semantic_unavailable_behavior: "abstain",
  required_privacy_model_unavailable_behavior: "refuse"
})) {
  if (policy?.[key] !== expected) errors.push(`model runtime_policy.${key} must equal ${JSON.stringify(expected)}.`);
}

const models = Array.isArray(modelDocument?.models) ? modelDocument.models : [];
if (models.length === 0) errors.push("model inventory must contain at least one reviewed entry.");
const inventoryIds = new Set();
for (const [index, model] of models.entries()) {
  const prefix = `models[${index}]`;
  for (const key of ["inventory_id", "provider", "model_id", "licence", "availability", "runtime_status", "fail_behavior"]) {
    if (!nonEmptyString(model?.[key])) errors.push(`${prefix}.${key} is required.`);
  }
  if (inventoryIds.has(model?.inventory_id)) errors.push(`${prefix}.inventory_id is duplicated.`);
  inventoryIds.add(model?.inventory_id);
  if (!isCommit(model?.revision)) errors.push(`${prefix}.revision must be an exact 40-character commit.`);
  if (model?.trust_remote_code !== false || model?.local_files_only !== true) {
    errors.push(`${prefix} must enforce trust_remote_code=false and local_files_only=true.`);
  }
  if (!Number.isInteger(model?.memory_limit_mb) || model.memory_limit_mb <= 0) errors.push(`${prefix}.memory_limit_mb must be positive.`);
  if (!Number.isInteger(model?.timeout_seconds) || model.timeout_seconds <= 0) errors.push(`${prefix}.timeout_seconds must be positive.`);
  if (
    (!Number.isInteger(model?.maximum_sequence_length) || model.maximum_sequence_length <= 0) &&
    (!Number.isInteger(model?.maximum_input_characters) || model.maximum_input_characters <= 0)
  ) {
    errors.push(`${prefix} requires a positive maximum_sequence_length or maximum_input_characters.`);
  }
  if (!arrayOfStrings(model?.limitations)) errors.push(`${prefix}.limitations must be a non-empty string list.`);
  if (!Array.isArray(model?.validated_languages)) errors.push(`${prefix}.validated_languages must be a list.`);

  const localAvailable = model?.availability === "local_verified";
  if (localAvailable) {
    if (!nonEmptyString(model?.local_path) || !isSha256(model?.local_sha256)) {
      errors.push(`${prefix} local_verified entries require local_path and local_sha256.`);
    }
  } else if (
    model?.local_path !== null ||
    model?.local_sha256 !== null ||
    !new Set(["blocked_abstain", "blocked_refuse"]).has(model?.runtime_status)
  ) {
    errors.push(`${prefix} unavailable entries must have null local attestations and a blocked runtime status.`);
  }
  if (model?.required_for_text_analysis === true && model?.runtime_status !== "blocked_refuse") {
    errors.push(`${prefix} required unavailable models must fail closed with blocked_refuse.`);
  }
  if (model?.required_for_text_analysis === false && model?.runtime_status === "blocked_refuse") {
    errors.push(`${prefix} optional unavailable models must abstain rather than refuse all analysis.`);
  }

  if (!Array.isArray(model?.upstream_files) || model.upstream_files.length === 0) {
    errors.push(`${prefix}.upstream_files must record reviewed upstream metadata.`);
  }
  for (const [fileIndex, file] of (model?.upstream_files ?? []).entries()) {
    if (!nonEmptyString(file?.path) || !Number.isInteger(file?.bytes) || file.bytes <= 0 || !isSha256(file?.upstream_sha256)) {
      errors.push(`${prefix}.upstream_files[${fileIndex}] requires path, positive bytes and upstream_sha256.`);
    }
  }
}

failIfErrors("Signal registry validation", errors);
