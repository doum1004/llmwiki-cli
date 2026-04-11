import { resolve, dirname } from "path";
import { loadConfig } from "./config.ts";
import { loadRegistry } from "./registry.ts";
import type { ResolvedWiki, GlobalOptions } from "../types.ts";

export async function resolveWiki(
  options: GlobalOptions,
): Promise<ResolvedWiki | null> {
  if (options.wiki) {
    return resolveFromRegistry(options.wiki);
  }

  const fromCwd = await resolveFromCwd();
  if (fromCwd) return fromCwd;

  return resolveDefault();
}

async function resolveFromRegistry(id: string): Promise<ResolvedWiki | null> {
  const registry = await loadRegistry();
  const entry = registry.wikis[id];
  if (!entry) return null;
  const config = await loadConfig(entry.path);
  if (!config) return null;
  return { config, root: entry.path, id };
}

async function resolveFromCwd(): Promise<ResolvedWiki | null> {
  let dir = resolve(process.cwd());
  const root =
    process.platform === "win32"
      ? dir.split(":")[0] + ":\\"
      : "/";

  while (true) {
    const config = await loadConfig(dir);
    if (config) {
      return { config, root: dir, id: config.name };
    }
    const parent = dirname(dir);
    if (parent === dir || parent === root) break;
    dir = parent;
  }
  return null;
}

async function resolveDefault(): Promise<ResolvedWiki | null> {
  const registry = await loadRegistry();
  if (!registry.default) return null;
  return resolveFromRegistry(registry.default);
}
