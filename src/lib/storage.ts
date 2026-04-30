import { join } from "path";
import { WikiManager } from "./wiki.ts";
import type { WikiConfig, StorageProvider } from "../types.ts";

export interface CreateProviderOptions {
  /** When set, use `join(wikiRoot, "profiles", profile)` for page I/O. */
  storageProfile?: string;
}

export function effectiveFilesystemRoot(wikiRoot: string, profile: string | undefined): string {
  if (profile === undefined) return wikiRoot;
  return join(wikiRoot, "profiles", profile);
}

export async function createProvider(
  config: WikiConfig,
  root: string,
  options?: CreateProviderOptions,
): Promise<StorageProvider> {
  const profile = options?.storageProfile;
  return new WikiManager(effectiveFilesystemRoot(root, profile));
}
