#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { failIfErrors, repoRoot } from "./lib.mjs";

const errors = [];
const lock = await readFile(
  resolve(repoRoot, "services/signal-engine/requirements-dev.lock"),
  "utf8"
);

if (!lock.includes("pip-compile --extra=audio_research --extra=dev --generate-hashes")) {
  errors.push("Python lock must record hash-generating dev and audio_research inputs.");
}
if (/^(?:-e|--editable|https?:|git\+)/m.test(lock)) {
  errors.push("Python lock cannot contain editable, URL or VCS requirements.");
}

const requirementLines = lock
  .split("\n")
  .filter((line) => /^[a-z0-9][a-z0-9._-]*==/i.test(line));
if (requirementLines.length < 20) {
  errors.push("Python lock does not contain the expected resolved dependency set.");
}
for (const direct of [
  "fastapi",
  "editables",
  "hatchling",
  "httpx",
  "librosa",
  "numpy",
  "pydantic",
  "pytest",
  "pytest-cov",
  "pyyaml",
  "scipy",
  "uvicorn"
]) {
  if (!requirementLines.some((line) => line.toLowerCase().startsWith(`${direct}==`))) {
    errors.push(`Python lock is missing direct dependency ${direct}.`);
  }
}

const workflow = await readFile(resolve(repoRoot, ".github/workflows/quality.yml"), "utf8");
if (!workflow.includes("PIP_NO_INDEX=1 .venv/bin/python -m pip install --no-build-isolation --no-deps -e services/signal-engine")) {
  errors.push("CI editable install must use the locked build backend without build isolation or index access.");
}
if (workflow.includes(".venv/bin/python -m pip install --upgrade pip")) {
  errors.push("CI cannot perform an unpinned pip upgrade before locked installation.");
}

const blocks = lock.split(/\n(?=[a-z0-9][a-z0-9._-]*==)/i).slice(1);
for (const block of blocks) {
  const name = block.match(/^([a-z0-9][a-z0-9._-]*)==/i)?.[1] ?? "unknown";
  if (!/--hash=sha256:[0-9a-f]{64}/i.test(block)) {
    errors.push(`Locked dependency ${name} has no SHA-256 artifact hash.`);
  }
}

failIfErrors("Python lock validation", errors);
