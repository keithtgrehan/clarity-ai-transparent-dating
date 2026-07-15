import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveRepoPath } from "../src/lib/paths.js";

function run(script: string, args: string[] = []) {
  return spawnSync(process.execPath, [resolveRepoPath(script), ...args], {
    cwd: resolveRepoPath("."),
    encoding: "utf8"
  });
}

test("governance validators accept tracked registries", { timeout: 10_000 }, () => {
  const resources = run("scripts/governance/validate-resource-registry.mjs");
  const claims = run("scripts/governance/validate-claims.mjs");
  assert.equal(resources.status, 0, resources.stderr);
  assert.match(resources.stdout, /passed/);
  assert.equal(claims.status, 0, claims.stderr);
  assert.match(claims.stdout, /passed/);
});

test("governance validators reject malformed or unsupported records", { timeout: 10_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "clarity-governance-test-"));
  try {
    const resourceFile = join(directory, "resources.yml");
    const claimsFile = join(directory, "claims.yml");
    const restrictedFiles = join(directory, "restricted-files.txt");
    const rawFile = join(directory, "raw.txt");
    const rawFiles = join(directory, "raw-files.txt");
    const publicCopyFile = join(directory, "public-copy.yml");
    await writeFile(resourceFile, "schemaVersion: 1\nowner: Test\nlastReviewedAt: '2026-07-14'\nresources: [{}]\n");
    await writeFile(
      claimsFile,
      "schemaVersion: 1\nowner: Test\nlastReviewedAt: '2026-07-14'\nclaims:\n  - id: bad\n    claim: Unsupported\n    status: unsupported\n    publicCopyRule: allowed\n    owner: Test\n"
    );
    await writeFile(restrictedFiles, "data/runtime/local-db.json\n");
    await writeFile(
      rawFile,
      ["<raw", "_message>private test fixture</raw", "_message>\n"].join("")
    );
    await writeFile(rawFiles, `${rawFile}\n`);
    await writeFile(
      publicCopyFile,
      "schemaVersion: 1\nowner: Test\nlastReviewedAt: '2026-07-14'\nresources:\n  - id: blocked-copy\n    name: Blocked\n    kind: code\n    repository: https://example.test/repo\n    revision: abc\n    rightsStatus: copyleft\n    useStatus: in_use\n    reviewedAt: '2026-07-14'\n    targetPath: src/copied.ts\n    authorizationBasis: none\n    prohibitedUses: [code_copy]\n    sourcePaths:\n      - { path: src/source.ts, blob: 0000000000000000000000000000000000000000 }\n"
    );

    assert.notEqual(
      run("scripts/governance/validate-resource-registry.mjs", ["--file", resourceFile]).status,
      0
    );
    assert.notEqual(run("scripts/governance/validate-claims.mjs", ["--file", claimsFile]).status, 0);
    assert.notEqual(
      run("scripts/governance/check-restricted-artifacts.mjs", [
        "--all-tracked",
        "--files-from",
        restrictedFiles
      ]).status,
      0
    );
    assert.notEqual(
      run("scripts/governance/check-no-raw-content.mjs", ["--files-from", rawFiles]).status,
      0
    );
    assert.notEqual(
      run("scripts/governance/check-public-copy.mjs", ["--file", publicCopyFile]).status,
      0
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
