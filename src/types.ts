export interface StorageProvider {
  readPage(relativePath: string): Promise<string | null>;
  writePage(relativePath: string, content: string): Promise<void>;
  appendPage(relativePath: string, content: string): Promise<boolean>;
  deletePage(relativePath: string): Promise<void>;
  pageExists(relativePath: string): Promise<boolean>;
  listPages(dir?: string): Promise<string[]>;
}

export interface WikiConfig {
  name: string;
  domain: string;
  created: string;
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
}

export interface ResolvedWiki {
  config: WikiConfig;
  root: string;
  id: string;
}

export interface WikiContext extends ResolvedWiki {
  provider: StorageProvider;
}

export interface GlobalOptions {
  wiki?: string;
}
