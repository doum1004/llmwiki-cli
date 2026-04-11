import { WikiManager } from "./wiki.ts";
import { GitProvider } from "./git-provider.ts";
import type { BackendType, StorageProvider, WikiContext } from "../types.ts";

export function createProvider(
  backend: BackendType,
  root: string,
): StorageProvider {
  switch (backend) {
    case "filesystem":
      return new WikiManager(root);
    case "git":
      return new GitProvider(root);
    case "supabase":
      throw new Error("Supabase backend not yet implemented.");
    default:
      throw new Error(
        `Unknown storage backend: "${backend}". Supported: filesystem, git`,
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
