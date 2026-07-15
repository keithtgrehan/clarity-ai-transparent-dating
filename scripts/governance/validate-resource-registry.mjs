#!/usr/bin/env node

import {
  argumentValue,
  failIfErrors,
  isObject,
  nonEmptyString,
  readYaml
} from "./lib.mjs";

const registryPath = argumentValue("--file", "configs/resource_registry.yml");
const { value: registry } = await readYaml(registryPath);
const errors = [];
const allowedRights = new Set([
  "owner_authorized",
  "permissive",
  "copyleft",
  "metadata_declared_review_required",
  "NOASSERTION"
]);
const allowedUses = new Set(["in_use", "approved_adaptation", "planned_reference_only", "blocked"]);

if (!isObject(registry) || registry.schemaVersion !== 1) {
  errors.push("schemaVersion must equal 1.");
}

if (!nonEmptyString(registry?.owner) || !nonEmptyString(registry?.lastReviewedAt)) {
  errors.push("owner and lastReviewedAt are required.");
}

for (const className of [
  "donorCandidates",
  "externalPriorArt",
  "externalLicenceDependencies",
  "copiedImplementationCode"
]) {
  if (!Array.isArray(registry?.inventoryClasses?.[className])) {
    errors.push(`inventoryClasses.${className} must be an array.`);
  }
}

for (const [index, dependency] of (registry?.inventoryClasses?.externalLicenceDependencies ?? []).entries()) {
  for (const key of ["name", "version", "licence", "source"]) {
    if (!nonEmptyString(dependency?.[key])) {
      errors.push(`inventoryClasses.externalLicenceDependencies[${index}].${key} is required.`);
    }
  }
}

if ((registry?.inventoryClasses?.copiedImplementationCode ?? []).length !== 0) {
  errors.push("copiedImplementationCode must remain empty for the Phase 0/1 cutline.");
}

if (!Array.isArray(registry?.resources) || registry.resources.length === 0) {
  errors.push("resources must be a non-empty array.");
} else {
  const ids = new Set();

  registry.resources.forEach((resource, index) => {
    const prefix = `resources[${index}]`;
    if (!isObject(resource)) {
      errors.push(`${prefix} must be an object.`);
      return;
    }

    for (const key of ["id", "name", "kind", "repository", "revision", "rightsStatus", "useStatus", "reviewedAt"]) {
      if (!nonEmptyString(resource[key])) {
        errors.push(`${prefix}.${key} is required.`);
      }
    }

    if (ids.has(resource.id)) {
      errors.push(`${prefix}.id duplicates ${resource.id}.`);
    }
    ids.add(resource.id);

    if (!allowedRights.has(resource.rightsStatus)) {
      errors.push(`${prefix}.rightsStatus is not recognized.`);
    }
    if (!allowedUses.has(resource.useStatus)) {
      errors.push(`${prefix}.useStatus is not recognized.`);
    }
    if (!Array.isArray(resource.prohibitedUses) || resource.prohibitedUses.length === 0) {
      errors.push(`${prefix}.prohibitedUses must be a non-empty array.`);
    }

    if (resource.useStatus === "approved_adaptation" || resource.useStatus === "in_use") {
      for (const key of [
        "authorizationBasis",
        "targetPath",
        "transformationSummary",
        "embeddedDependencyReview",
        "reviewer",
        "approvalDate"
      ]) {
        if (!nonEmptyString(resource[key])) {
          errors.push(`${prefix}.${key} is required for used or approved material.`);
        }
      }
      if (!Array.isArray(resource.sourcePaths) || resource.sourcePaths.length === 0) {
        errors.push(`${prefix}.sourcePaths must pin adapted material.`);
      }
    }

    for (const [pathIndex, source] of (resource.sourcePaths ?? []).entries()) {
      if (!isObject(source) || !nonEmptyString(source.path)) {
        errors.push(`${prefix}.sourcePaths[${pathIndex}].path is required.`);
      }
      if (!/^[0-9a-f]{40}$/i.test(source?.blob ?? "")) {
        errors.push(`${prefix}.sourcePaths[${pathIndex}].blob must be a 40-character git blob hash.`);
      }
    }

    if (
      resource.rightsStatus === "copyleft" &&
      resource.useStatus !== "planned_reference_only" &&
      resource.useStatus !== "blocked"
    ) {
      errors.push(`${prefix} cannot copy copyleft material without a recorded project-licence decision.`);
    }

    if (
      resource.rightsStatus === "NOASSERTION" &&
      ["approved_adaptation", "in_use"].includes(resource.useStatus) &&
      resource.authorizationBasis !== "Keith Grehan owner authorization recorded 2026-07-14"
    ) {
      errors.push(`${prefix} uses NOASSERTION material without the recorded owner authorization.`);
    }
    if (
      resource.rightsStatus === "metadata_declared_review_required" &&
      ["approved_adaptation", "in_use"].includes(resource.useStatus) &&
      resource.rightsReviewStatus !== "approved"
    ) {
      errors.push(`${prefix} requires rightsReviewStatus: approved before use.`);
    }
  });

  const registeredIds = new Set(registry.resources.map((resource) => resource?.id));
  for (const className of ["donorCandidates", "externalPriorArt"]) {
    for (const id of registry?.inventoryClasses?.[className] ?? []) {
      if (!registeredIds.has(id)) errors.push(`inventoryClasses.${className} references unknown resource ${id}.`);
    }
  }
}

failIfErrors("Resource registry validation", errors);
