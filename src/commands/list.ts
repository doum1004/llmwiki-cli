import { Command } from "commander";
import type { WikiContext } from "../types.ts";

export function makeListCommand(): Command {
  return new Command("list")
    .description("List wiki pages")
    .argument("[dir]", "subdirectory to list")
    .option("--tree", "show as tree structure")
    .option("--json", "output as JSON array")
    .action(async function (
      this: Command,
      dir: string | undefined,
      options: { tree?: boolean; json?: boolean },
    ) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const pages = await ctx.provider.listPages(dir);

      if (options.json) {
        console.log(JSON.stringify(pages, null, 2));
        return;
      }

      if (pages.length === 0) {
        console.log("No pages found.");
        return;
      }

      if (options.tree) {
        printTree(pages);
        return;
      }

      for (const page of pages) {
        console.log(page);
      }
    });
}

function printTree(pages: string[]): void {
  const tree: Record<string, string[]> = {};
  for (const page of pages) {
    const parts = page.split("/");
    if (parts.length === 1) {
      const dir = ".";
      tree[dir] = tree[dir] ?? [];
      tree[dir]!.push(parts[0]!);
    } else {
      const dir = parts.slice(0, -1).join("/");
      const file = parts[parts.length - 1]!;
      tree[dir] = tree[dir] ?? [];
      tree[dir]!.push(file);
    }
  }

  const dirs = Object.keys(tree).sort();
  for (const dir of dirs) {
    console.log(`${dir}/`);
    const files = tree[dir]!;
    for (let i = 0; i < files.length; i++) {
      const prefix = i === files.length - 1 ? "  └── " : "  ├── ";
      console.log(`${prefix}${files[i]}`);
    }
  }
}
