#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { failIfErrors, repoRoot, trackedFiles } from "./lib.mjs";

const scope = /^(?:services\/signal-engine\/(?:app|communication_signal_engine)|apps\/api\/src\/(?:routes\/v2-signal-analysis|services\/signal)|apps\/web\/src\/(?:pages\/SignalReviewPage|pages\/signalReviewModel)|packages\/shared\/src)/;
const exclude = /(?:^|\/)(?:test|tests|__pycache__|dist|node_modules)(?:\/|$)/;
const residue = /\b(?:earnings call|earnings-call|ticker|SEC filing|guidance revision|retail investor|EBITDA|revenue guidance|fiscal quarter)\b/i;
const errors = [];

for (const file of trackedFiles().filter((path) => scope.test(path) && !exclude.test(path))) {
  try {
    if (residue.test(await readFile(resolve(repoRoot, file), "utf8"))) {
      errors.push(`${file}: finance-domain residue in communication runtime`);
    }
  } catch {
    // Missing/unreadable files are handled by the ordinary build and restricted-file checks.
  }
}

failIfErrors("Signal domain-residue scan", errors);
