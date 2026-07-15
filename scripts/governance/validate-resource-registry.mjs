#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  argumentValue,
  failIfErrors,
  isObject,
  nonEmptyString,
  readYaml,
  repoRoot
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

const registeredDependencies = registry?.inventoryClasses?.externalLicenceDependencies ?? [];
const dependencyNames = new Set();
for (const [index, dependency] of registeredDependencies.entries()) {
  for (const key of ["name", "version", "licence", "source"]) {
    if (!nonEmptyString(dependency?.[key])) {
      errors.push(`inventoryClasses.externalLicenceDependencies[${index}].${key} is required.`);
    }
  }
  if (dependencyNames.has(dependency?.name)) {
    errors.push(`inventoryClasses.externalLicenceDependencies duplicates ${dependency.name}.`);
  }
  dependencyNames.add(dependency?.name);
}

const manifestPaths = [
  "package.json",
  "apps/api/package.json",
  "apps/web/package.json",
  "packages/shared/package.json"
];
const directExternalDependencies = new Set();
for (const manifestPath of manifestPaths) {
  const manifest = JSON.parse(await readFile(resolve(repoRoot, manifestPath), "utf8"));
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (!name.startsWith("@clarity/")) directExternalDependencies.add(name);
    }
  }
}
for (const name of directExternalDependencies) {
  if (!dependencyNames.has(name)) {
    errors.push(`Direct external package ${name} is not registered in externalLicenceDependencies.`);
  }
}

const packageLock = JSON.parse(await readFile(resolve(repoRoot, "package-lock.json"), "utf8"));
for (const dependency of registeredDependencies.filter((item) => item?.source === "package-lock.json")) {
  const packageSuffix = `node_modules/${dependency.name}`;
  const candidates = Object.entries(packageLock.packages ?? {})
    .filter(([path]) => path === packageSuffix || path.endsWith(`/${packageSuffix}`))
    .map(([, metadata]) => metadata);
  const locked = candidates.find((item) => item?.version === String(dependency.version));
  if (candidates.length === 0) {
    errors.push(`Registered package ${dependency.name} is absent from package-lock.json.`);
    continue;
  }
  if (!locked) {
    errors.push(
      `Registered package ${dependency.name} version ${dependency.version} does not match any lock entry.`
    );
    continue;
  }
  if (locked.license !== dependency.licence) {
    errors.push(
      `Registered package ${dependency.name} licence ${dependency.licence} does not match lock ${locked.license}.`
    );
  }
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
      if (
        (!Array.isArray(resource.sourcePaths) || resource.sourcePaths.length === 0) &&
        (!Array.isArray(resource.sourceSnapshots) || resource.sourceSnapshots.length === 0)
      ) {
        errors.push(`${prefix} must pin adapted material with sourcePaths or sourceSnapshots.`);
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

    for (const [snapshotIndex, snapshot] of (resource.sourceSnapshots ?? []).entries()) {
      const snapshotPrefix = `${prefix}.sourceSnapshots[${snapshotIndex}]`;
      if (!isObject(snapshot) || !nonEmptyString(snapshot.path)) {
        errors.push(`${snapshotPrefix}.path is required.`);
      }
      if (!/^[0-9a-f]{40}$/i.test(snapshot?.baseRevision ?? "")) {
        errors.push(`${snapshotPrefix}.baseRevision must be a 40-character commit hash.`);
      }
      if (!/^[0-9a-f]{40}$/i.test(snapshot?.gitBlob ?? "")) {
        errors.push(`${snapshotPrefix}.gitBlob must be a 40-character Git blob hash.`);
      }
      if (!/^[0-9a-f]{64}$/i.test(snapshot?.sha256 ?? "")) {
        errors.push(`${snapshotPrefix}.sha256 must be a 64-character SHA-256.`);
      }
      if (!new Set(["modified", "untracked"]).has(snapshot?.dirtyStatus)) {
        errors.push(`${snapshotPrefix}.dirtyStatus must be modified or untracked.`);
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
      !new Set([
        "Keith Grehan owner authorization recorded 2026-07-14",
        "Keith Grehan owner instruction recorded 2026-07-15 in D018"
      ]).has(resource.authorizationBasis)
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
  for (const id of registry?.inventoryClasses?.copiedImplementationCode ?? []) {
    if (!registeredIds.has(id)) {
      errors.push(`inventoryClasses.copiedImplementationCode references unknown resource ${id}.`);
      continue;
    }
    const resource = registry.resources.find((item) => item?.id === id);
    if (!resource || !["approved_adaptation", "in_use"].includes(resource.useStatus)) {
      errors.push(`copiedImplementationCode resource ${id} must be approved_adaptation or in_use.`);
    }
  }
}

failIfErrors("Resource registry validation", errors);
