import { join } from "path";
import { WikiManager } from "./wiki.ts";
import { GitProvider } from "./git-provider.ts";
import type { WikiConfig, StorageProvider } from "../types.ts";
import { resolvedGitToken } from "./git-credentials.ts";

export interface CreateProviderOptions {
  /** When set, filesystem/git use `join(wikiRoot, "profiles", profile)` for page I/O. */
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
  const backend = config.backend ?? "filesystem";
  const profile = options?.storageProfile;
  switch (backend) {
    case "filesystem":
      return new WikiManager(effectiveFilesystemRoot(root, profile));
    case "git": {
      const token = resolvedGitToken(config);
      const repo = config.git?.repo;
      const gitCfg =
        repo && token ? { repo, token } : undefined;
      return new GitProvider(
        root,
        gitCfg,
        effectiveFilesystemRoot(root, profile),
      );
    }
    default:
      throw new Error(
        `Unknown storage backend: "${backend}". Supported: filesystem, git`,
      );
  }
}
