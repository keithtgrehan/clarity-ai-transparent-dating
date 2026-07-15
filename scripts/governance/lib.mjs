import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));

export function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

export async function readYaml(relativeOrAbsolutePath) {
  const path = resolve(repoRoot, relativeOrAbsolutePath);
  return { path, value: parse(await readFile(path, "utf8")) };
}

export function trackedFiles() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: repoRoot,
    encoding: "utf8"
  })
    .split("\0")
    .filter(Boolean);
}

export function failIfErrors(label, errors) {
  if (errors.length === 0) {
    console.log(`${label} passed.`);
    return;
  }

  console.error(`${label} failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
}

export function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
