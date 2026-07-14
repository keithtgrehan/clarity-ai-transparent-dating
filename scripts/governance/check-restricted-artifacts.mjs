#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { argumentValue, failIfErrors, trackedFiles } from "./lib.mjs";

const allTracked = process.argv.includes("--all-tracked");
if (!allTracked) {
  console.error("Use --all-tracked so the check has an explicit scan scope.");
  process.exit(2);
}

const filesFrom = argumentValue("--files-from");
const files = filesFrom
  ? readFileSync(filesFrom, "utf8").split(/\r?\n/).filter(Boolean)
  : trackedFiles();

const forbidden = [
  { pattern: /(^|\/)\.env(\.|$)/, allow: /\.env\.example$/, reason: "tracked environment file" },
  { pattern: /(^|\/)node_modules\//, reason: "vendored dependency directory" },
  { pattern: /^data\/runtime\/(?!\.gitkeep$)/, reason: "mutable runtime data" },
  { pattern: /(^|\/)(raw[-_ ]?transcripts?|participant[-_ ]?exports?|private[-_ ]?messages?)(\/|\.|$)/i, reason: "raw or participant artifact" },
  { pattern: /\.(pem|key|p12|pfx|sqlite3?|db)$/i, reason: "credential or database artifact" },
  { pattern: /(^|\/)(models?|checkpoints?)\/.*\.(bin|pt|pth|onnx|safetensors|joblib|pkl)$/i, reason: "model artifact" }
];

const errors = [];
for (const file of files) {
  for (const rule of forbidden) {
    if (rule.pattern.test(file) && !rule.allow?.test(file)) {
      errors.push(`${file}: ${rule.reason}`);
    }
  }
}

failIfErrors("Restricted artifact scan", errors);
