import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function detectRepoRoot() {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
    resolve(currentDir, "../../../../"),
    resolve(currentDir, "../../../")
  ];

  const repoRoot = candidates.find(
    (candidate) =>
      existsSync(resolve(candidate, "package.json")) &&
      existsSync(resolve(candidate, "apps/api/package.json"))
  );

  return repoRoot ?? resolve(currentDir, "../../../../");
}

export const repoRootDir = detectRepoRoot();
export const apiRootDir = resolve(repoRootDir, "apps/api");

export function resolveApiPath(relativePath: string) {
  return resolve(apiRootDir, relativePath);
}

export function resolveRepoPath(relativePath: string) {
  return resolve(repoRootDir, relativePath);
}

export function resolveStorageFilePath() {
  const configuredPath = process.env.API_STORAGE_FILE ?? "../../data/runtime/local-db.json";
  return resolve(apiRootDir, configuredPath);
}
