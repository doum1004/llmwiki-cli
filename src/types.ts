export type BackendType = "filesystem" | "git";

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
  /** Optional storage profile: filesystem/git subdirectory `profiles/<slug>/`. */
  profile?: string;
  git?: {
    /** Prefer `LLMWIKI_GIT_TOKEN` or `GITHUB_TOKEN`; optional legacy field in YAML. */
    token?: string;
    repo: string;
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
  /** Registry wiki id → active storage profile slug. */
  storageProfiles?: Record<string, string>;
}

export interface ResolvedWiki {
  config: WikiConfig;
  root: string;
  id: string;
}

export type StorageProfileSource = "env" | "cli" | "registry" | "config" | "default";

export interface WikiContext extends ResolvedWiki {
  provider: StorageProvider;
  /** Resolved profile, source, and physical/logical storage location. */
  storageScope: {
    profile: string | undefined;
    source: StorageProfileSource;
    /** Directory used for filesystem/git page I/O (under `profiles/<slug>` when profile is set). */
    effectiveRoot: string;
  };
}

export interface GlobalOptions {
  wiki?: string;
  profile?: string;
}
