import { Command } from "commander";
import { search } from "../lib/search.ts";
import { loadRegistry } from "../lib/registry.ts";
import { createProvider } from "../lib/storage.ts";
import type { WikiContext } from "../types.ts";
import type { SearchResult } from "../lib/search.ts";

export function makeSearchCommand(): Command {
  return new Command("search")
    .description("Search wiki pages")
    .argument("<query>", "search terms")
    .option("-l, --limit <n>", "max results", "10")
    .option("-a, --all", "search across all registered wikis")
    .option("--json", "output as JSON")
    .action(async function (
      this: Command,
      query: string,
      options: { limit: string; all?: boolean; json?: boolean },
    ) {
      const limit = parseInt(options.limit, 10);
      let results: (SearchResult & { wiki?: string })[] = [];

      if (options.all) {
        const registry = await loadRegistry();
        for (const [id, entry] of Object.entries(registry.wikis)) {
          const wiki = createProvider("filesystem", entry.path);
          const hits = await search(wiki, query, { limit });
          for (const hit of hits) {
            results.push({ ...hit, wiki: id });
          }
        }
        results.sort((a, b) => b.score - a.score);
        results = results.slice(0, limit);
      } else {
        const ctx: WikiContext = this.optsWithGlobals().wikiContext;
        results = await search(ctx.provider, query, { limit });
      }

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (results.length === 0) {
        console.log("No results found.");
        return;
      }

      for (const r of results) {
        const prefix = r.wiki ? `[${r.wiki}] ` : "";
        console.log(`${prefix}${r.path} (score: ${r.score})`);
        console.log(`  ${r.snippet}`);
        console.log();
      }
    });
}
