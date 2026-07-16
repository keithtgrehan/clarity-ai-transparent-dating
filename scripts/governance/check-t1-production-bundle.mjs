#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { failIfErrors, repoRoot } from "./lib.mjs";

const dist = resolve(repoRoot, "apps/web/dist");
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (/\.(?:html|js|css|map)$/.test(entry.name)) files.push(path);
  }
}

await collect(dist);
const prohibited = [
  "/signal-review/user-draft",
  "/v2/communication-analysis/user-draft",
  "T1UserDraftReviewPage",
  "Prepare a fictional self-authored draft"
];
const errors = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const marker of prohibited) {
    if (content.includes(marker)) {
      errors.push(`${file.slice(repoRoot.length + 1)} contains disabled T1 marker ${marker}.`);
    }
  }
}

failIfErrors("T1 production-bundle check", errors);
