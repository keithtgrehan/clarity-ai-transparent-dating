#!/usr/bin/env node

import { failIfErrors, nonEmptyString, readYaml } from "./lib.mjs";

const { value: registry } = await readYaml("configs/research_source_registry.yml");
const errors = [];

if (registry?.schemaVersion !== 1) errors.push("schemaVersion must equal 1.");
for (const key of ["owner", "lastReviewedAt", "purpose", "policy"]) {
  if (!nonEmptyString(registry?.[key])) errors.push(`${key} is required.`);
}
for (const key of [
  "collectionAllowed",
  "rawStorageAllowed",
  "quotingAllowed",
  "trainingAllowed",
  "benchmarkRowsAllowed"
]) {
  if (registry?.defaults?.[key] !== false) errors.push(`defaults.${key} must be false.`);
}

const classes = Array.isArray(registry?.sourceClasses) ? registry.sourceClasses : [];
const ids = new Set();
for (const [index, source] of classes.entries()) {
  const prefix = `sourceClasses[${index}]`;
  for (const key of ["id", "evidenceDisposition", "canonicalIndex", "specialCategoryRisk"]) {
    if (!nonEmptyString(source?.[key])) errors.push(`${prefix}.${key} is required.`);
  }
  if (ids.has(source?.id)) errors.push(`${prefix}.id is duplicated.`);
  ids.add(source?.id);
  if (!Array.isArray(source?.allowedUses) || !Array.isArray(source?.prohibitedUses) || source.prohibitedUses.length === 0) {
    errors.push(`${prefix} requires allowedUses and non-empty prohibitedUses.`);
  }
  if (source?.canonicalIndex !== "docs/research/RESEARCH_INDEX.md") {
    errors.push(`${prefix}.canonicalIndex must point to the canonical research index.`);
  }
}

for (const id of [
  "peer_reviewed_publication",
  "official_law_regulation_or_guidance",
  "technical_standard_or_platform_terms",
  "support_resource_or_community_source_class",
  "donor_or_internal_method_reference"
]) {
  if (!ids.has(id)) errors.push(`Required source class ${id} is missing.`);
}

const community = classes.find((source) => source?.id === "support_resource_or_community_source_class");
for (const term of ["username", "quote", "post", "comment", "thread", "scrape", "training", "benchmark"]) {
  if (!(community?.prohibitedUses ?? []).includes(term)) {
    errors.push(`Community source class must prohibit ${term}.`);
  }
}
for (const key of [
  "participantResearchAllowed",
  "publicContentCollectionAllowed",
  "privateContentAllowed",
  "modelTrainingAllowed",
  "effectivenessClaimAllowed"
]) {
  if (registry?.currentDecision?.[key] !== false) errors.push(`currentDecision.${key} must be false.`);
}

failIfErrors("Research source registry validation", errors);
