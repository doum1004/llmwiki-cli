import type { StorageProfileSource } from "../types.ts";

/** Slug used as the second segment of composite Supabase wiki_id (name:profile) or filesystem path segment. */
const PROFILE_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function validateProfileSlug(raw: string): string {
  const s = raw.trim();
  if (!PROFILE_RE.test(s)) {
    throw new Error(
      `Invalid storage profile: use 1–64 characters [a-zA-Z0-9_-] only (got ${JSON.stringify(raw)})`,
    );
  }
  return s;
}

export function compositeSupabaseWikiId(wikiName: string, profile: string): string {
  return `${wikiName}:${profile}`;
}

/**
 * Precedence: LLMWIKI_PROFILE env → --profile → registry → .llmwiki.yaml → none.
 */
export function resolveStorageProfile(params: {
  envValue?: string | undefined;
  cliValue?: string | undefined;
  registryValue?: string | undefined;
  configValue?: string | undefined;
}): { profile: string | undefined; source: StorageProfileSource } {
  if (params.envValue?.trim()) {
    return { profile: validateProfileSlug(params.envValue), source: "env" };
  }
  if (params.cliValue?.trim()) {
    return { profile: validateProfileSlug(params.cliValue), source: "cli" };
  }
  if (params.registryValue?.trim()) {
    return { profile: validateProfileSlug(params.registryValue), source: "registry" };
  }
  if (params.configValue?.trim()) {
    return { profile: validateProfileSlug(params.configValue), source: "config" };
  }
  return { profile: undefined, source: "default" };
}

/** @deprecated Use resolveStorageProfile */
export const resolveSupabaseProfile = resolveStorageProfile;
