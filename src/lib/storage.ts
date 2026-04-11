import { WikiManager } from "./wiki.ts";
import { GitProvider } from "./git-provider.ts";
import type { WikiConfig, StorageProvider, WikiContext } from "../types.ts";

export async function createProvider(
  config: WikiConfig,
  root: string,
): Promise<StorageProvider> {
  const backend = config.backend ?? "filesystem";
  switch (backend) {
    case "filesystem":
      return new WikiManager(root);
    case "git":
      return new GitProvider(root);
    case "supabase": {
      if (!config.supabase?.url || !config.supabase?.key) {
        throw new Error(
          "Supabase config missing. Set supabase.url and supabase.key in .llmwiki.yaml",
        );
      }
      const { SupabaseProvider } = await import("./supabase-provider.ts");
      return SupabaseProvider.create(
        config.supabase.url,
        config.supabase.key,
        config.name,
      );
    }
    default:
      throw new Error(
        `Unknown storage backend: "${backend}". Supported: filesystem, git, supabase`,
      );
  }
}

export function requireGit(ctx: WikiContext, commandName: string): void {
  const backend = ctx.config.backend ?? "filesystem";
  if (backend !== "git") {
    console.error(
      `"wiki ${commandName}" requires git backend. This wiki uses "${backend}".`,
    );
    process.exit(1);
  }
}
