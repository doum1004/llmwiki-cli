import { Command } from "commander";
import { parseFrontmatter } from "../lib/frontmatter.ts";
import { IndexManager } from "../lib/index-manager.ts";
import { LogManager } from "../lib/log-manager.ts";
import type { WikiContext } from "../types.ts";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/** Non-empty trimmed string from YAML `title`, or undefined. */
function titleFromFrontmatter(
  frontmatter: Record<string, unknown> | null,
): string | undefined {
  if (!frontmatter || !("title" in frontmatter)) return undefined;
  const raw = frontmatter.title;
  const s = raw == null ? "" : String(raw).trim();
  return s || undefined;
}

export function makeWriteCommand(): Command {
  return new Command("write")
    .description("Write stdin to a page (create or overwrite)")
    .argument("<path>", "relative path to the page")
    .option(
      "--index-summary <summary>",
      "after writing, add this page to wiki/index.md with the given one-line summary",
    )
    .option(
      "--log-type <type>",
      "after writing, append a log entry with this type (use with --log-message, or with --from-frontmatter and YAML title)",
    )
    .option(
      "--log-message <message>",
      "after writing, append a log entry with this message (use with --log-type)",
    )
    .option(
      "--from-frontmatter",
      "use YAML title for index and/or log when --index-summary or --log-message is omitted",
    )
    .action(
      async function (
        this: Command,
        pagePath: string,
        options: {
          indexSummary?: string;
          logType?: string;
          logMessage?: string;
          fromFrontmatter?: boolean;
        },
      ) {
        const { indexSummary, logType, logMessage, fromFrontmatter } = options;

        const ctx: WikiContext = this.optsWithGlobals().wikiContext;
        const content = await readStdin();
        if (!content) {
          console.error("No content provided on stdin.");
          process.exit(1);
        }

        const { frontmatter } = parseFrontmatter(content);
        const fmTitle = fromFrontmatter
          ? titleFromFrontmatter(frontmatter)
          : undefined;

        if (
          fromFrontmatter &&
          !fmTitle &&
          ((indexSummary === undefined && !logType) ||
            (Boolean(logType) && logMessage === undefined))
        ) {
          console.error(
            "wiki write: --from-frontmatter requires a non-empty YAML title when omitting --index-summary (with no full log), or when using --log-type without --log-message.",
          );
          process.exit(1);
        }

        let resolvedIndexSummary: string | undefined;
        if (indexSummary !== undefined) {
          const s = indexSummary.trim();
          if (!s) {
            console.error("wiki write: --index-summary cannot be empty.");
            process.exit(1);
          }
          resolvedIndexSummary = s;
        } else if (fromFrontmatter && fmTitle) {
          resolvedIndexSummary = fmTitle;
        }

        let resolvedLogMessage: string | undefined;
        let resolvedLogType: string | undefined;
        if (logType && logMessage !== undefined) {
          resolvedLogType = logType;
          resolvedLogMessage = logMessage;
        } else if (logType && fromFrontmatter && fmTitle) {
          resolvedLogType = logType;
          resolvedLogMessage = fmTitle;
        } else if (logType || logMessage !== undefined) {
          if (logType && !logMessage) {
            console.error(
              "wiki write: use --log-message with --log-type, or add --from-frontmatter with a YAML title.",
            );
            process.exit(1);
          }
          console.error(
            "wiki write: --log-type and --log-message must be used together.",
          );
          process.exit(1);
        }

        await ctx.provider.writePage(pagePath, content);
        console.log(`wrote ${pagePath}`);

        if (resolvedIndexSummary) {
          const indexMgr = new IndexManager(ctx.provider);
          await indexMgr.addEntry(pagePath, resolvedIndexSummary);
          console.log(`Added to index: ${pagePath}`);
        }

        if (resolvedLogType && resolvedLogMessage) {
          const logMgr = new LogManager(ctx.provider);
          await logMgr.append(resolvedLogType, resolvedLogMessage);
          console.log(`Logged: ${resolvedLogType} | ${resolvedLogMessage}`);
        }
      },
    );
}
