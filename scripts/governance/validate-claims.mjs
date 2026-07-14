#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  argumentValue,
  failIfErrors,
  isObject,
  nonEmptyString,
  readYaml,
  repoRoot
} from "./lib.mjs";

const claimsPath = argumentValue("--file", "configs/claims_matrix.yml");
const { value: matrix } = await readYaml(claimsPath);
const errors = [];
const statuses = new Set(["supported", "unsupported", "prohibited"]);

if (!isObject(matrix) || matrix.schemaVersion !== 1) {
  errors.push("schemaVersion must equal 1.");
}

if (!nonEmptyString(matrix?.owner) || !nonEmptyString(matrix?.lastReviewedAt)) {
  errors.push("owner and lastReviewedAt are required.");
}

if (!Array.isArray(matrix?.claims) || matrix.claims.length === 0) {
  errors.push("claims must be a non-empty array.");
} else {
  const ids = new Set();
  matrix.claims.forEach((claim, index) => {
    const prefix = `claims[${index}]`;
    for (const key of ["id", "claim", "status", "publicCopyRule", "owner"]) {
      if (!nonEmptyString(claim?.[key])) {
        errors.push(`${prefix}.${key} is required.`);
      }
    }
    if (ids.has(claim?.id)) {
      errors.push(`${prefix}.id duplicates ${claim.id}.`);
    }
    ids.add(claim?.id);
    if (!statuses.has(claim?.status)) {
      errors.push(`${prefix}.status must be supported, unsupported, or prohibited.`);
    }
    if (claim?.status === "supported" && (!Array.isArray(claim.evidence) || claim.evidence.length === 0)) {
      errors.push(`${prefix}.evidence is required for a supported claim.`);
    }
    for (const [evidenceIndex, evidence] of (claim?.evidence ?? []).entries()) {
      if (!nonEmptyString(evidence) || !existsSync(resolve(repoRoot, evidence))) {
        errors.push(`${prefix}.evidence[${evidenceIndex}] must resolve to a repository path.`);
      }
    }
    if (claim?.status !== "supported" && claim?.publicCopyRule === "allowed") {
      errors.push(`${prefix} cannot allow public copy for an unsupported or prohibited claim.`);
    }
  });
}

failIfErrors("Claims matrix validation", errors);
