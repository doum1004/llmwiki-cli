import { Command } from "commander";
import { loadRegistry, setDefault } from "../lib/registry.ts";
import { pickWiki } from "../lib/picker.ts";

export function makeUseCommand(): Command {
  return new Command("use")
    .description("Set the active wiki")
    .argument("[wiki-id]", "wiki identifier to activate")
    .action(async (wikiId: string | undefined) => {
      if (!wikiId) {
        const selected = await pickWiki();
        if (!selected) {
          process.exit(1);
        }
        wikiId = selected.id;
      }

      const success = await setDefault(wikiId);
      if (!success) {
        const registry = await loadRegistry();
        const ids = Object.keys(registry.wikis);
        console.error(`Wiki "${wikiId}" not found in registry.`);
        if (ids.length > 0) {
          console.error(`Available wikis: ${ids.join(", ")}`);
        } else {
          console.error('No wikis registered. Run "wiki init" first.');
        }
        process.exit(1);
      }

      console.log(`Active wiki set to "${wikiId}".`);
    });
}
