#!/usr/bin/env node

import { execFileSync } from "node:child_process";
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
}

if (verified === 0) errors.push("No donor source pins were verified.");
failIfErrors(`Donor provenance validation (${verified} exact pins)`, errors);
