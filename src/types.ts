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

export interface WikiContext {
  config: WikiConfig;
  root: string;
  id: string;
}

export interface GlobalOptions {
  wiki?: string;
}
