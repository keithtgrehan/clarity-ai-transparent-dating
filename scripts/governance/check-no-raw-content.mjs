#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { argumentValue, failIfErrors, repoRoot, trackedFiles } from "./lib.mjs";

const markers = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /<(?:raw_message|raw_transcript)>/i,
  /"(?:rawMessage|rawContent|transcriptText)"\s*:/,
  /dataClassification\s*:\s*["']?(?:participant|raw_private)/i
];
const excludedImplementations = /^scripts\/governance\//;
const errors = [];
const filesFrom = argumentValue("--files-from");
const files = filesFrom
  ? (await readFile(filesFrom, "utf8")).split(/\r?\n/).filter(Boolean)
  : trackedFiles();

for (const file of files) {
  if (excludedImplementations.test(file)) {
    continue;
  }

  const path = resolve(repoRoot, file);
  let text;
  try {
    const buffer = await readFile(path);
    if (buffer.includes(0) || buffer.length > 2_000_000) {
      continue;
    }
    text = buffer.toString("utf8");
  } catch {
    continue;
  }

  if (markers.some((marker) => marker.test(text))) {
    errors.push(`${file}: possible raw/private content marker`);
  }
}

failIfErrors("Raw content scan", errors);
