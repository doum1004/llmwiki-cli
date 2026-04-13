export type BackendType = "filesystem" | "git" | "supabase";

export interface StorageProvider {
  readPage(relativePath: string): Promise<string | null>;
  writePage(relativePath: string, content: string): Promise<void>;
  appendPage(relativePath: string, content: string): Promise<boolean>;
  pageExists(relativePath: string): Promise<boolean>;
  listPages(dir?: string): Promise<string[]>;
}

export interface WikiConfig {
  name: string;
  domain: string;
  created: string;
  backend?: BackendType;
  /**
   * Optional storage profile for any backend: Supabase composite wiki_id, or filesystem/git
   * subdirectory `profiles/<slug>/`. Prefer this over supabase.profile.
   */
  profile?: string;
  git?: {
    /** Prefer `LLMWIKI_GIT_TOKEN` or `GITHUB_TOKEN`; optional legacy field in YAML. */
    token?: string;
    repo: string;
  };
  supabase?: {
    url: string;
    key: string;
    /** Optional namespace; rows use wiki_id "name:profile". Organizational only with a shared API key. */
    profile?: string;
    /**
     * Optional Supabase Auth access token (JWT) for PostgREST. Prefer env LLMWIKI_SUPABASE_ACCESS_TOKEN;
     * storing tokens in YAML is risky. Required for RLS-backed tables when not using the service role.
     */
    access_token?: string;
  };
  paths: {
    raw: string;
    wiki: string;
    schema: string;
  };
}

export interface RegistryEntry {
  path: string;
  name: string;
  domain: string;
  created: string;
  remote?: string;
}

export interface Registry {
  wikis: Record<string, RegistryEntry>;
  default: string | null;
  /** Registry wiki id → active storage profile slug (all backends). */
  storageProfiles?: Record<string, string>;
  /** @deprecated Merged into storageProfiles on load; not written on new saves. */
  supabaseProfiles?: Record<string, string>;
}

export interface ResolvedWiki {
  config: WikiConfig;
  root: string;
  id: string;
}

export type StorageProfileSource = "env" | "cli" | "registry" | "config" | "default";

/** @deprecated Use StorageProfileSource */
export type SupabaseProfileSource = StorageProfileSource;

export interface WikiContext extends ResolvedWiki {
  provider: StorageProvider;
  /** Resolved profile, source, and physical/logical storage location for all backends. */
  storageScope: {
    profile: string | undefined;
    source: StorageProfileSource;
    /** Directory used for filesystem/git page I/O (under `profiles/<slug>` when profile is set). */
    effectiveRoot: string;
    /** Supabase only: composite wiki_id. */
    supabaseWikiId?: string;
  };
}

export interface GlobalOptions {
  wiki?: string;
  profile?: string;
}
