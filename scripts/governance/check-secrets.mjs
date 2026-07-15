#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { failIfErrors, repoRoot, trackedFiles } from "./lib.mjs";

const excluded = /(?:^|\/)(?:node_modules|dist|build|coverage|__pycache__)(?:\/|$)|(?:^|\/)package-lock\.json$/;
const signatures = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{70,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/
];
const errors = [];

for (const file of trackedFiles().filter((path) => !excluded.test(path))) {
  try {
    const buffer = await readFile(resolve(repoRoot, file));
    if (buffer.includes(0) || buffer.length > 2_000_000) continue;
    if (signatures.some((pattern) => pattern.test(buffer.toString("utf8")))) {
      errors.push(`${file}: possible credential material`);
    }
  } catch {
    // Other validators handle unreadable paths.
  }
}

failIfErrors("Secret scan", errors);
