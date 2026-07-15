#!/usr/bin/env node

import { argumentValue, failIfErrors, isObject, readYaml } from "./lib.mjs";

const registryPath = argumentValue("--file", "configs/resource_registry.yml");
const { value: registry } = await readYaml(registryPath);
const errors = [];

if (!isObject(registry) || !Array.isArray(registry.resources)) {
  errors.push("Resource registry is missing or malformed.");
} else {
  for (const resource of registry.resources) {
    const copied = ["approved_adaptation", "in_use"].includes(resource.useStatus);
    if (!copied) {
      continue;
    }
    if (
      (!Array.isArray(resource.sourcePaths) || resource.sourcePaths.length === 0) &&
      (!Array.isArray(resource.sourceSnapshots) || resource.sourceSnapshots.length === 0)
    ) {
      errors.push(`${resource.id}: copied/adapted material has no immutable source pins.`);
    }
    if (!resource.targetPath) {
      errors.push(`${resource.id}: copied/adapted material has no targetPath.`);
    }
    for (const field of [
      "transformationSummary",
      "embeddedDependencyReview",
      "reviewer",
      "approvalDate"
    ]) {
      if (typeof resource[field] !== "string" || resource[field].trim().length === 0) {
        errors.push(`${resource.id}: copied/adapted material has no ${field}.`);
      }
    }
    if (resource.rightsStatus === "copyleft") {
      errors.push(`${resource.id}: copyleft copying is blocked while Clarity has no project licence.`);
    }
    if (resource.rightsStatus === "NOASSERTION" && !resource.authorizationBasis) {
      errors.push(`${resource.id}: NOASSERTION copying lacks explicit authorization.`);
    }
    if (
      resource.kind === "untracked_worktree_snapshot" &&
      (!resource.disclosureBasis || !resource.sourceSnapshots?.every((snapshot) => snapshot.sha256 && snapshot.gitBlob))
    ) {
      errors.push(`${resource.id}: public worktree-snapshot disclosure lacks D019 authority or byte pins.`);
    }
    if (
      resource.rightsStatus === "metadata_declared_review_required" &&
      resource.rightsReviewStatus !== "approved"
    ) {
      errors.push(`${resource.id}: metadata-only licence evidence requires an approved rights review.`);
    }
  }
}

failIfErrors("Public copy safety check", errors);
