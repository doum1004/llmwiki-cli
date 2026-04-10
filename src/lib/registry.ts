import * as yaml from "js-yaml";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import type { Registry, RegistryEntry } from "../types.ts";

function getRegistryDir(): string {
  return process.env.LLMWIKI_CONFIG_DIR ?? join(homedir(), ".config", "llmwiki");
}

function getRegistryPath(): string {
  return join(getRegistryDir(), "registry.yaml");
}

function emptyRegistry(): Registry {
  return { wikis: {}, default: null };
}

export async function loadRegistry(): Promise<Registry> {
  try {
    const content = await readFile(getRegistryPath(), "utf-8");
    const parsed = yaml.load(content) as Registry | null;
    return parsed ?? emptyRegistry();
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyRegistry();
    }
    throw err;
  }
}

export async function saveRegistry(registry: Registry): Promise<void> {
  await mkdir(getRegistryDir(), { recursive: true });
  const content = yaml.dump(registry, { lineWidth: 120, sortKeys: false });
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
