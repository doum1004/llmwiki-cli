import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { WikiManager } from "../src/lib/wiki.ts";
import { search } from "../src/lib/search.ts";

let testDir: string;
let wiki: WikiManager;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-search-"));
  wiki = new WikiManager(testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("search", () => {
  it("finds pages containing query terms", async () => {
    await wiki.writePage("a.md", "The attention mechanism is important.");
    await wiki.writePage("b.md", "Unrelated content about cooking.");
    const results = await search(wiki, "attention");
    expect(results).toHaveLength(1);
    expect(results[0]!.path).toBe("a.md");
  });

  it("ranks by term frequency", async () => {
    await wiki.writePage(
      "few.md",
      "Attention is used once in this document.",
    );
    await wiki.writePage(
      "many.md",
      "Attention attention attention. The attention mechanism uses attention.",
    );
    const results = await search(wiki, "attention");
    expect(results).toHaveLength(2);
    expect(results[0]!.path).toBe("many.md");
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
  });

  it("returns snippets around first match", async () => {
    await wiki.writePage("page.md", "Some preamble text. The key concept is transformers. More text after.");
    const results = await search(wiki, "transformers");
    expect(results).toHaveLength(1);
    expect(results[0]!.snippet).toContain("transformers");
  });

  it("respects --limit", async () => {
    for (let i = 0; i < 5; i++) {
      await wiki.writePage(`p${i}.md`, `This page mentions topic number ${i}.`);
    }
    const results = await search(wiki, "topic", { limit: 3 });
    expect(results).toHaveLength(3);
  });

  it("returns empty array for no matches", async () => {
    await wiki.writePage("page.md", "Some content here.");
    const results = await search(wiki, "nonexistent");
    expect(results).toEqual([]);
  });

  it("handles multi-word queries", async () => {
    await wiki.writePage("a.md", "Machine learning is a field of study.");
    await wiki.writePage("b.md", "This is about machine design only.");
    const results = await search(wiki, "machine learning");
    expect(results).toHaveLength(2);
    // "a.md" matches both terms, "b.md" matches only one
    expect(results[0]!.path).toBe("a.md");
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
  });

  it("is case insensitive", async () => {
    await wiki.writePage("page.md", "Attention and ATTENTION and attention.");
    const results = await search(wiki, "ATTENTION");
    expect(results).toHaveLength(1);
    expect(results[0]!.score).toBe(3);
  });

  it("returns empty for empty query", async () => {
    await wiki.writePage("page.md", "content");
    const results = await search(wiki, "   ");
    expect(results).toEqual([]);
  });
});
