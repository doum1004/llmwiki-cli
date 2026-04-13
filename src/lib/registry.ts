import * as yaml from "js-yaml";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import type { Registry, RegistryEntry } from "../types.ts";
import { validateProfileSlug } from "./supabase-profile.ts";

function getRegistryDir(): string {
  return process.env.LLMWIKI_CONFIG_DIR ?? join(homedir(), ".config", "llmwiki");
}

function getRegistryPath(): string {
  return join(getRegistryDir(), "registry.yaml");
}

function emptyRegistry(): Registry {
  return { wikis: {}, default: null };
}

/** Merge legacy supabaseProfiles into storageProfiles and drop the legacy key from memory. */
function normalizeRegistry(parsed: Registry | null): Registry {
  if (!parsed) return emptyRegistry();
  const wikis = parsed.wikis ?? {};
  const legacy = parsed.supabaseProfiles ?? {};
  const modern = parsed.storageProfiles ?? {};
  const merged: Record<string, string> = { ...legacy, ...modern };
  const out: Registry = {
    wikis,
    default: parsed.default ?? null,
  };
  if (Object.keys(merged).length > 0) {
    out.storageProfiles = merged;
  }
  return out;
}

export async function loadRegistry(): Promise<Registry> {
  try {
    const content = await readFile(getRegistryPath(), "utf-8");
    const parsed = yaml.load(content) as Registry | null;
    return normalizeRegistry(parsed);
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyRegistry();
    }
    throw err;
  }
}

export async function saveRegistry(registry: Registry): Promise<void> {
  await mkdir(getRegistryDir(), { recursive: true });
  const toSave = { ...registry };
  delete toSave.supabaseProfiles;
  const content = yaml.dump(toSave, { lineWidth: 120, sortKeys: false });
  await writeFile(getRegistryPath(), content, "utf-8");
}

export async function addToRegistry(
  id: string,
  entry: RegistryEntry,
): Promise<void> {
  const registry = await loadRegistry();
  registry.wikis[id] = entry;
  if (Object.keys(registry.wikis).length === 1) {
    registry.default = id;
  }
  await saveRegistry(registry);
}

export async function removeFromRegistry(id: string): Promise<boolean> {
  const registry = await loadRegistry();
  if (!(id in registry.wikis)) return false;
  delete registry.wikis[id];
  if (registry.storageProfiles && id in registry.storageProfiles) {
    delete registry.storageProfiles[id];
    if (Object.keys(registry.storageProfiles).length === 0) {
      delete registry.storageProfiles;
    }
  }
  if (registry.default === id) {
    const ids = Object.keys(registry.wikis);
    registry.default = ids[0] ?? null;
  }
  await saveRegistry(registry);
  return true;
}

export async function setDefault(id: string): Promise<boolean> {
  const registry = await loadRegistry();
  if (!(id in registry.wikis)) return false;
  registry.default = id;
  await saveRegistry(registry);
  return true;
}

export function getStorageProfile(registry: Registry, wikiId: string): string | undefined {
  const v = registry.storageProfiles?.[wikiId];
  return v?.trim() ? v.trim() : undefined;
}

/** @deprecated Use getStorageProfile */
export const getSupabaseProfile = getStorageProfile;

/** Persist active storage profile for a registry wiki id. Pass null to remove. */
export async function setStorageProfile(
  wikiId: string,
  profile: string | null,
): Promise<boolean> {
  const registry = await loadRegistry();
  if (!(wikiId in registry.wikis)) return false;
  if (profile === null) {
    if (registry.storageProfiles && wikiId in registry.storageProfiles) {
      delete registry.storageProfiles[wikiId];
      if (Object.keys(registry.storageProfiles).length === 0) {
        delete registry.storageProfiles;
      }
    }
  } else {
    const slug = validateProfileSlug(profile);
    if (!registry.storageProfiles) registry.storageProfiles = {};
    registry.storageProfiles[wikiId] = slug;
  }
  await saveRegistry(registry);
  return true;
}

/** @deprecated Use setStorageProfile */
export const setSupabaseProfile = setStorageProfile;
