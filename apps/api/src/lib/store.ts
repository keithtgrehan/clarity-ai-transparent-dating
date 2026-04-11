import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { LocalDataStoreSchema, type LocalDataStore } from "@project-a-z/shared";
import { resolveStorageFilePath } from "./paths.js";

const emptyStore: LocalDataStore = {
  users: [],
  profiles: [],
  conversations: [],
  messages: [],
  reports: [],
  waitlistLeads: [],
  moderationFlags: []
};

async function ensureStoreDirectory() {
  await mkdir(dirname(resolveStorageFilePath()), { recursive: true });
}

export async function ensureStoreFile() {
  await ensureStoreDirectory();

  try {
    await readFile(resolveStorageFilePath(), "utf8");
  } catch {
    await writeStore(emptyStore);
  }
}

export async function readStore() {
  await ensureStoreFile();
  const raw = await readFile(resolveStorageFilePath(), "utf8");
  const parsed = JSON.parse(raw);
  return LocalDataStoreSchema.parse(parsed);
}

export async function writeStore(store: LocalDataStore) {
  await ensureStoreDirectory();
  const validated = LocalDataStoreSchema.parse(store);
  await writeFile(resolveStorageFilePath(), JSON.stringify(validated, null, 2));
}
