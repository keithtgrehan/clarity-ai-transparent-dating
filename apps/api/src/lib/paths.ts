import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

export const apiRootDir = resolve(currentDir, "../../");
export const repoRootDir = resolve(currentDir, "../../../../");

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
