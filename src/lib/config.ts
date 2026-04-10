import * as yaml from "js-yaml";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import type { WikiConfig } from "../types.ts";

const CONFIG_FILENAME = ".llmwiki.yaml";

export async function loadConfig(dir: string): Promise<WikiConfig | null> {
  const configPath = join(dir, CONFIG_FILENAME);
  try {
    const content = await readFile(configPath, "utf-8");
    return yaml.load(content) as WikiConfig;
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function saveConfig(
  dir: string,
  config: WikiConfig,
): Promise<void> {
  const configPath = join(dir, CONFIG_FILENAME);
  const content = yaml.dump(config, { lineWidth: 120, sortKeys: false });
  await writeFile(configPath, content, "utf-8");
}
