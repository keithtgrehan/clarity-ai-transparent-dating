#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { argumentValue, failIfErrors, readYaml } from "./lib.mjs";

const registryPath = argumentValue("--file", "configs/resource_registry.yml");
const donorRoot = resolve(argumentValue("--donor-root", ".."));
const { value: registry } = await readYaml(registryPath);
const donorIds = new Set(registry?.inventoryClasses?.donorCandidates ?? []);
const errors = [];
let verified = 0;

function git(repoPath, args) {
  return execFileSync("git", ["-C", repoPath, ...args], { encoding: "utf8" }).trim();
}

for (const resource of registry?.resources ?? []) {
  if (!donorIds.has(resource.id)) continue;

  const repositoryDirectory = basename(new URL(resource.repository).pathname).replace(/\.git$/, "");
  const repoPath = resolve(donorRoot, repositoryDirectory);

  try {
    git(repoPath, ["cat-file", "-e", `${resource.revision}^{commit}`]);
  } catch {
    errors.push(`${resource.id}: revision ${resource.revision} is unavailable in ${repoPath}.`);
    continue;
  }

  for (const source of resource.sourcePaths ?? []) {
    try {
      const actualBlob = git(repoPath, ["rev-parse", `${resource.revision}:${source.path}`]);
      if (actualBlob !== source.blob) {
        errors.push(`${resource.id}:${source.path} expected ${source.blob} but resolved ${actualBlob}.`);
      } else {
        verified += 1;
      }
    } catch {
      errors.push(`${resource.id}:${source.path} does not resolve at ${resource.revision}.`);
    }
  }

  for (const snapshot of resource.sourceSnapshots ?? []) {
    const sourcePath = resolve(repoPath, snapshot.path);
    if (!sourcePath.startsWith(`${repoPath}/`)) {
      errors.push(`${resource.id}:${snapshot.path} resolves outside the donor repository.`);
      continue;
    }
    try {
      const head = git(repoPath, ["rev-parse", "HEAD"]);
      const status = git(repoPath, ["status", "--porcelain=v1", "--", snapshot.path]);
      const expectedPrefix = snapshot.dirtyStatus === "untracked" ? "??" : " M";
      const blob = git(repoPath, ["hash-object", snapshot.path]);
      const sha256 = createHash("sha256").update(await readFile(sourcePath)).digest("hex");
      if (head !== snapshot.baseRevision) {
        errors.push(`${resource.id}:${snapshot.path} donor HEAD ${head} differs from ${snapshot.baseRevision}.`);
      }
      if (!status.startsWith(expectedPrefix)) {
        errors.push(`${resource.id}:${snapshot.path} dirty status does not match ${snapshot.dirtyStatus}.`);
      }
      if (blob !== snapshot.gitBlob) {
        errors.push(`${resource.id}:${snapshot.path} Git blob ${blob} differs from ${snapshot.gitBlob}.`);
      }
      if (sha256 !== snapshot.sha256) {
        errors.push(`${resource.id}:${snapshot.path} SHA-256 differs from the approved snapshot.`);
      }
      if (
        head === snapshot.baseRevision &&
        status.startsWith(expectedPrefix) &&
        blob === snapshot.gitBlob &&
        sha256 === snapshot.sha256
      ) {
        verified += 1;
      }
    } catch {
      errors.push(`${resource.id}:${snapshot.path} working-tree snapshot could not be verified.`);
    }
  }
}

if (verified === 0) errors.push("No donor source pins were verified.");
failIfErrors(`Donor provenance validation (${verified} exact pins)`, errors);
