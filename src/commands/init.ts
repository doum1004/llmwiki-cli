import { Command } from "commander";
import { resolve, basename } from "path";
import { mkdir, writeFile } from "fs/promises";
import { loadConfig, saveConfig } from "../lib/config.ts";
import { addToRegistry } from "../lib/registry.ts";
import {
  getDefaultConfig,
  getDefaultSchema,
  getDefaultIndex,
} from "../lib/templates.ts";
import type { RegistryEntry } from "../types.ts";

export function makeInitCommand(): Command {
  return new Command("init")
    .description("Initialize a new wiki")
    .argument("[dir]", "directory to initialize (defaults to cwd)")
    .option("-n, --name <name>", "wiki name")
    .option("-d, --domain <domain>", "knowledge domain", "general")
    .action(
      async (
        dir: string | undefined,
        options: {
          name?: string;
          domain: string;
        },
      ) => {
        const targetDir = resolve(dir ?? ".");
        const name = options.name ?? basename(targetDir);
        const domain = options.domain;

        const existingConfig = await loadConfig(targetDir);
        if (existingConfig) {
          console.error(
            `Wiki already exists at ${targetDir}. Remove .llmwiki.yaml or choose a different directory.`,
          );
          process.exit(1);
        }

        await mkdir(targetDir, { recursive: true });

        const config = getDefaultConfig(name, domain);
        await saveConfig(targetDir, config);

        const dirs = [
          resolve(targetDir, "raw"),
          resolve(targetDir, "raw/assets"),
          resolve(targetDir, "wiki"),
          resolve(targetDir, "wiki/entities"),
          resolve(targetDir, "wiki/concepts"),
          resolve(targetDir, "wiki/sources"),
          resolve(targetDir, "wiki/synthesis"),
        ];
        await Promise.all(dirs.map((d) => mkdir(d, { recursive: true })));

        await Promise.all([
          writeFile(
            resolve(targetDir, "SCHEMA.md"),
            getDefaultSchema(name, domain),
            "utf-8",
          ),
          writeFile(
            resolve(targetDir, "wiki/index.md"),
            getDefaultIndex(),
            "utf-8",
          ),
        ]);

        const entry: RegistryEntry = {
          path: targetDir,
          name,
          domain,
          created: config.created,
        };
        await addToRegistry(name, entry);

        console.log(`Wiki "${name}" initialized at ${targetDir}`);
        console.log(`Domain: ${domain}`);
        console.log("Registered in global registry.");
      },
    );
}
