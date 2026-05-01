import { WikiManager } from "./wiki.ts";
import type { WikiConfig, StorageProvider } from "../types.ts";

export async function createProvider(
  _config: WikiConfig,
  root: string,
): Promise<StorageProvider> {
  return new WikiManager(root);
}
