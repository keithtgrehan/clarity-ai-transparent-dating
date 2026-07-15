#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { failIfErrors, repoRoot, trackedFiles } from "./lib.mjs";

const inScope = /^(?:services\/signal-engine\/(?:app|communication_signal_engine|README\.md)|apps\/(?:api|web)\/src|packages\/shared\/src|configs\/cue_registry_v1\.yml|\.env\.example)/;
const excluded = /(?:^|\/)(?:test|tests|__pycache__|dist|node_modules)(?:\/|$)/;
const prohibited = [
  { pattern: /zero[ _-]?pii/i, reason: "identifier-removal guarantee name" },
  { pattern: /fully anonymous/i, reason: "anonymity guarantee" },
  { pattern: /all identifiers removed/i, reason: "complete-removal guarantee" },
  { pattern: /secure erase/i, reason: "storage-erasure guarantee" },
  { pattern: /guaranteed deletion/i, reason: "deletion guarantee" },
  { pattern: /\bAudioSanitizer\b/, reason: "misleading audio sanitizer name" },
  { pattern: /\b(?:NEURO_DIVERGENT|CLARITY_AI|VIBE_SIGNAL|CONFIDENCE_VISUALIZER)\b/, reason: "product or diagnosis-adjacent mode ID" },
  { pattern: /\b(?:info-dump(?:ing)?|hyperfixation|emotional valence)\b/i, reason: "prohibited person-level inference framing" },
  {
    pattern: /\b(?:monotonic|monotone)\s+(?:speech|voice|tone|pitch|speaker|person|affect)\b|\b(?:speech|voice|tone|pitch|speaker|person|affect)\s+(?:is\s+)?(?:monotonic|monotone)\b/i,
    reason: "prohibited person-level inference framing"
  }
];

const errors = [];
for (const file of trackedFiles().filter((path) => inScope.test(path) && !excluded.test(path))) {
  let text;
  try {
    text = await readFile(resolve(repoRoot, file), "utf8");
  } catch {
    continue;
  }
  for (const rule of prohibited) {
    if (rule.pattern.test(text)) errors.push(`${file}: ${rule.reason}`);
  }
}

failIfErrors("Signal safety-language scan", errors);
