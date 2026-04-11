import { Command } from "commander";
import { resolve, basename } from "path";
import { mkdir, writeFile } from "fs/promises";
import { saveConfig } from "../lib/config.ts";
import { addToRegistry } from "../lib/registry.ts";
import * as git from "../lib/git.ts";
import {
  getDefaultConfig,
  getDefaultSchema,
  getDefaultIndex,
  getDefaultLog,
} from "../lib/templates.ts";
import type { BackendType, RegistryEntry } from "../types.ts";

export function makeInitCommand(): Command {
  return new Command("init")
    .description("Initialize a new wiki")
    .argument("[dir]", "directory to initialize (defaults to cwd)")
    .option("-n, --name <name>", "wiki name")
    .option("-d, --domain <domain>", "knowledge domain", "general")
    .option("-b, --backend <type>", "storage backend (filesystem, git, supabase)", "filesystem")
    .action(
      async (
        dir: string | undefined,
        options: { name?: string; domain: string; backend: string },
      ) => {
        const backend = options.backend as BackendType;
        const targetDir = resolve(dir ?? ".");
        const name = options.name ?? basename(targetDir);
        const domain = options.domain;

        // Create directory structure
        const dirs = [
          targetDir,
          resolve(targetDir, "raw"),
          resolve(targetDir, "raw/assets"),
          resolve(targetDir, "wiki"),
          resolve(targetDir, "wiki/entities"),
          resolve(targetDir, "wiki/concepts"),
          resolve(targetDir, "wiki/sources"),
          resolve(targetDir, "wiki/synthesis"),
        ];
        await Promise.all(dirs.map((d) => mkdir(d, { recursive: true })));

        // Write config
        const config = getDefaultConfig(name, domain, backend);
        await saveConfig(targetDir, config);

        // Write template files
        await Promise.all([
          writeFile(resolve(targetDir, "SCHEMA.md"), getDefaultSchema(name, domain), "utf-8"),
          writeFile(resolve(targetDir, "wiki/index.md"), getDefaultIndex(), "utf-8"),
          writeFile(resolve(targetDir, "wiki/log.md"), getDefaultLog(), "utf-8"),
        ]);

        // Git init + initial commit (git backend only)
        if (backend === "git") {
          const initResult = await git.init(targetDir);
          if (!initResult.ok) {
            console.error(`Warning: git init failed: ${initResult.output}`);
          } else {
            await git.addAll(targetDir);
            const commitResult = await git.commit(
              targetDir,
              "Initialize wiki",
            );
            if (!commitResult.ok) {
              console.error(
                `Warning: initial commit failed: ${commitResult.output}`,
              );
            }
          }
        }

        // Register in global registry
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
