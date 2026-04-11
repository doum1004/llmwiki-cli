import { WikiManager } from "./wiki.ts";
import type { BackendType, StorageProvider, WikiContext } from "../types.ts";

export function createProvider(
  backend: BackendType,
  root: string,
): StorageProvider {
  if (backend === "filesystem") return new WikiManager(root);
  throw new Error(
    `Unknown storage backend: "${backend}". Supported: filesystem`,
  );
}

export function requireFilesystem(
  ctx: WikiContext,
  commandName: string,
): void {
  const backend = ctx.config.backend ?? "filesystem";
  if (backend !== "filesystem") {
    console.error(
      `"wiki ${commandName}" requires filesystem backend. This wiki uses "${backend}".`,
    );
    process.exit(1);
  }
}
