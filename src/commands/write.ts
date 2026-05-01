import { Command } from "commander";
import { parseFrontmatter, addFrontmatter } from "../lib/frontmatter.ts";
import { IndexManager } from "../lib/index-manager.ts";
import type { WikiContext } from "../types.ts";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

const ALLOWED_KEYS = new Set([
  "title",
  "content",
  "description",
  "tags",
  "source",
  "created",
  "updated",
]);

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDateField(value: unknown, name: string): string {
  if (typeof value !== "string") {
    console.error(`wiki write: "${name}" must be a string.`);
    process.exit(1);
  }
  const t = value.trim();
  if (!t) {
    console.error(`wiki write: "${name}" cannot be empty.`);
    process.exit(1);
  }
  const ms = Date.parse(t.includes("T") ? t : `${t}T12:00:00.000Z`);
  if (Number.isNaN(ms)) {
    console.error(`wiki write: "${name}" must be a valid ISO date.`);
    process.exit(1);
  }
  return new Date(ms).toISOString().slice(0, 10);
}

function optionalIsoDate(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  return parseIsoDateField(value, name);
}

function frontmatterDate(
  fm: Record<string, unknown> | null,
  key: string,
): string | undefined {
  if (!fm || !(key in fm)) return undefined;
  const v = fm[key];
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && v.trim()) {
    const ms = Date.parse(
      v.includes("T") ? v.trim() : `${v.trim()}T12:00:00.000Z`,
    );
    if (!Number.isNaN(ms)) return new Date(ms).toISOString().slice(0, 10);
  }
  return undefined;
}

function validateUrl(source: string): void {
  try {
    const u = new URL(source);
    if (!u.protocol || u.protocol === ":") {
      console.error("wiki write: \"source\" must be a valid URL.");
      process.exit(1);
    }
  } catch {
    console.error("wiki write: \"source\" must be a valid URL.");
    process.exit(1);
  }
}

function shouldUpsertIndex(pagePath: string): boolean {
  return pagePath.startsWith("wiki/") && pagePath !== "wiki/index.md";
}

interface ParsedWriteJson {
  title: string;
  content: string;
  description?: string;
  tags?: string[];
  source?: string;
  created?: string;
  updated?: string;
}

function parseWritePayload(raw: unknown): ParsedWriteJson {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    console.error("wiki write: stdin must be a JSON object.");
    process.exit(1);
  }
  const obj = raw as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (!ALLOWED_KEYS.has(k)) {
      console.error(`wiki write: unknown property ${JSON.stringify(k)}.`);
      process.exit(1);
    }
  }

  if (typeof obj.title !== "string" || !obj.title.trim()) {
    console.error('wiki write: "title" is required and must be a non-empty string.');
    process.exit(1);
  }
  if (typeof obj.content !== "string" || !obj.content.trim()) {
    console.error('wiki write: "content" is required and must be a non-empty string.');
    process.exit(1);
  }

  let description: string | undefined;
  if ("description" in obj) {
    if (obj.description === undefined || obj.description === null) {
      description = undefined;
    } else if (typeof obj.description !== "string") {
      console.error('wiki write: "description" must be a string.');
      process.exit(1);
    } else {
      description = obj.description.trim() || undefined;
    }
  }

  let tags: string[] | undefined;
  if ("tags" in obj && obj.tags !== undefined) {
    if (!Array.isArray(obj.tags)) {
      console.error('wiki write: "tags" must be an array of strings.');
      process.exit(1);
    }
    tags = [];
    for (const item of obj.tags) {
      if (typeof item !== "string" || !item.trim()) {
        console.error('wiki write: "tags" must contain only non-empty strings.');
        process.exit(1);
      }
      tags.push(item.trim());
    }
    if (tags.length === 0) tags = undefined;
  }

  let source: string | undefined;
  if ("source" in obj && obj.source !== undefined) {
    if (typeof obj.source !== "string" || !obj.source.trim()) {
      console.error('wiki write: "source" must be a non-empty string when set.');
      process.exit(1);
    }
    source = obj.source.trim();
    validateUrl(source);
  }

  const created =
    "created" in obj ? optionalIsoDate(obj.created, "created") : undefined;
  const updated =
    "updated" in obj ? optionalIsoDate(obj.updated, "updated") : undefined;

  return {
    title: obj.title.trim(),
    content: obj.content,
    description,
    tags,
    source,
    created,
    updated,
  };
}

export function makeWriteCommand(): Command {
  return new Command("write")
    .description("Write a page from JSON on stdin (YAML frontmatter + markdown body); upserts wiki/index.md when path is under wiki/")
    .argument("<path>", "relative path to the page")
    .action(async function (this: Command, pagePath: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const stdinText = await readStdin();
      if (!stdinText.trim()) {
        console.error("wiki write: no JSON provided on stdin.");
        process.exit(1);
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(stdinText);
      } catch {
        console.error("wiki write: stdin is not valid JSON.");
        process.exit(1);
      }

      const payload = parseWritePayload(parsedJson);
      const exists = await ctx.provider.pageExists(pagePath);
      let existingFm: Record<string, unknown> | null = null;
      if (exists) {
        const raw = await ctx.provider.readPage(pagePath);
        existingFm = parseFrontmatter(raw ?? "").frontmatter;
      }

      let createdOut: string;
      if (exists) {
        const preserved = frontmatterDate(existingFm, "created");
        if (preserved) {
          createdOut = preserved;
        } else {
          createdOut = payload.created ?? todayUtc();
        }
      } else {
        createdOut = payload.created ?? todayUtc();
      }

      const updatedOut = payload.updated ?? todayUtc();

      const fm: Record<string, unknown> = {
        title: payload.title,
        created: createdOut,
        updated: updatedOut,
      };
      if (payload.description !== undefined) {
        fm.description = payload.description;
      }
      if (payload.tags !== undefined && payload.tags.length > 0) {
        fm.tags = payload.tags;
      }
      if (payload.source !== undefined) {
        fm.source = payload.source;
      }

      const markdown = addFrontmatter(payload.content, fm);
      await ctx.provider.writePage(pagePath, markdown);
      console.log(`wrote ${pagePath}`);

      if (shouldUpsertIndex(pagePath)) {
        const indexMgr = new IndexManager(ctx.provider);
        await indexMgr.upsertEntry(pagePath, payload.title);
        console.log(`updated index: ${pagePath}`);
      }
    });
}
