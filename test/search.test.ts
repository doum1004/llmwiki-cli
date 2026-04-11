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

  it("escapes regex special characters without crashing", async () => {
    await wiki.writePage("code.md", "The function uses array.map for mapping.");
    // Searching with regex special chars should not throw
    const results = await search(wiki, "array.map");
    expect(results).toHaveLength(1);
    expect(results[0]!.path).toBe("code.md");
  });

  it("handles dir filter", async () => {
    await wiki.writePage("wiki/concepts/a.md", "Machine learning concept.");
    await wiki.writePage("wiki/sources/b.md", "Machine learning paper.");
    const results = await search(wiki, "machine", { dir: "wiki/concepts" });
    expect(results).toHaveLength(1);
    expect(results[0]!.path).toBe("wiki/concepts/a.md");
  });

  it("snippet adds ellipsis for middle-of-content matches", async () => {
    const longContent = "A".repeat(200) + " target word " + "B".repeat(200);
    await wiki.writePage("long.md", longContent);
    const results = await search(wiki, "target");
    expect(results).toHaveLength(1);
    expect(results[0]!.snippet).toContain("...");
  });

  it("default limit is 10", async () => {
    for (let i = 0; i < 15; i++) {
      await wiki.writePage(`p${i}.md`, `Topic keyword in page ${i}.`);
    }
    const results = await search(wiki, "keyword");
    expect(results).toHaveLength(10);
  });

  it("handles empty wiki", async () => {
    const results = await search(wiki, "anything");
    expect(results).toEqual([]);
  });

  it("search with limit 1 returns top result", async () => {
    await wiki.writePage("high.md", "attention attention attention");
    await wiki.writePage("low.md", "attention once");
    const results = await search(wiki, "attention", { limit: 1 });
    expect(results).toHaveLength(1);
    expect(results[0]!.path).toBe("high.md");
  });
});
