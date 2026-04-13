import { join } from "path";
import { WikiManager } from "./wiki.ts";
import { GitProvider } from "./git-provider.ts";
import type { WikiConfig, StorageProvider } from "../types.ts";
import { compositeSupabaseWikiId } from "./supabase-profile.ts";

export interface CreateProviderOptions {
  /**
   * When set: Supabase uses composite wiki_id `name:profile`; filesystem/git use
   * `join(wikiRoot, "profiles", profile)` for page I/O.
   */
  storageProfile?: string;
  /** @deprecated Use storageProfile */
  supabaseProfile?: string;
  /**
   * Supabase Auth access token (JWT). If omitted, uses LLMWIKI_SUPABASE_ACCESS_TOKEN then supabase.access_token in config.
   * Use an anon key in .llmwiki.yaml plus a user JWT so RLS applies to that user's rows (and shared null-user_id rows).
   */
  supabaseAccessToken?: string;
}

function resolvedStorageProfile(options?: CreateProviderOptions): string | undefined {
  if (options?.storageProfile !== undefined) return options.storageProfile;
  return options?.supabaseProfile;
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
  const profile = resolvedStorageProfile(options);
  switch (backend) {
    case "filesystem":
      return new WikiManager(effectiveFilesystemRoot(root, profile));
    case "git":
      return new GitProvider(
        root,
        config.git,
        effectiveFilesystemRoot(root, profile),
      );
    case "supabase": {
      if (!config.supabase?.url || !config.supabase?.key) {
        throw new Error(
          "Supabase config missing. Set supabase.url and supabase.key in .llmwiki.yaml",
        );
      }
      const { SupabaseProvider } = await import("./supabase-provider.ts");
      const wikiId =
        profile !== undefined ? compositeSupabaseWikiId(config.name, profile) : config.name;
      const accessToken =
        options?.supabaseAccessToken ??
        process.env.LLMWIKI_SUPABASE_ACCESS_TOKEN ??
        config.supabase.access_token ??
        undefined;
      return SupabaseProvider.create(config.supabase.url, config.supabase.key, wikiId, {
        accessToken,
      });
    }
    default:
      throw new Error(
        `Unknown storage backend: "${backend}". Supported: filesystem, git, supabase`,
      );
  }
}
