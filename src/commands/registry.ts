import { Command } from "commander";
import { loadRegistry } from "../lib/registry.ts";

export function makeRegistryCommand(): Command {
  return new Command("registry")
    .description("List all registered wikis")
    .action(async () => {
      const registry = await loadRegistry();
      const entries = Object.entries(registry.wikis);

      if (entries.length === 0) {
        console.log('No wikis registered. Run "wiki init" to create one.');
        return;
      }

      console.log(`\nRegistered wikis (${entries.length}):\n`);
      for (const [id, wiki] of entries) {
        const marker = id === registry.default ? " *" : "";
        console.log(`  ${wiki.name} [${wiki.domain}]${marker}`);
        console.log(`    Path: ${wiki.path}`);
        console.log(`    Created: ${wiki.created}`);
        console.log();
      }
      if (registry.default) {
        console.log("  * = active wiki");
      }
    });
}
