import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { WikiManager } from "../src/lib/wiki.ts";
import { buildLinkGraph } from "../src/lib/link-parser.ts";
import { hasFrontmatter, parseFrontmatter, addFrontmatter } from "../src/lib/frontmatter.ts";

let testDir: string;
let wiki: WikiManager;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-lint-"));
  wiki = new WikiManager(testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("frontmatter", () => {
  it("detects frontmatter presence", () => {
    expect(hasFrontmatter("---\ntitle: Test\n---\nBody")).toBe(true);
    expect(hasFrontmatter("No frontmatter here")).toBe(false);
  });

  it("parses frontmatter correctly", () => {
    const result = parseFrontmatter("---\ntitle: Test\ntags: [a, b]\n---\nBody content");
    expect(result.frontmatter).toEqual({ title: "Test", tags: ["a", "b"] });
    expect(result.body).toBe("Body content");
  });

  it("returns null frontmatter for no frontmatter", () => {
    const result = parseFrontmatter("Just body content");
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe("Just body content");
  });

  it("addFrontmatter wraps content", () => {
    const result = addFrontmatter("Body text", { title: "Hello", tags: ["x"] });
    expect(result).toContain("---");
    expect(result).toContain("title: Hello");
    expect(result).toContain("Body text");
    expect(hasFrontmatter(result)).toBe(true);
  });
});

describe("lint checks", () => {
  it("detects broken wikilinks", async () => {
    await wiki.writePage("page.md", "Links to [[nonexistent]].");
    const graph = await buildLinkGraph(wiki);
    expect(graph.brokenLinks).toHaveLength(1);
  });

  it("detects orphan pages", async () => {
    await wiki.writePage("a.md", "No links.");
    await wiki.writePage("b.md", "Also no links.");
    const graph = await buildLinkGraph(wiki);
    expect(graph.orphans).toHaveLength(2);
  });

  it("detects missing frontmatter", async () => {
    const content = "No frontmatter here, just text.";
    expect(hasFrontmatter(content)).toBe(false);
  });

  it("clean wiki reports no broken links", async () => {
    await wiki.writePage("a.md", "Links to [[b]].");
    await wiki.writePage("b.md", "Links to [[a]].");
    const graph = await buildLinkGraph(wiki);
    expect(graph.brokenLinks).toHaveLength(0);
  });
});

describe("frontmatter edge cases", () => {
  it("handles frontmatter with no body", () => {
    const result = parseFrontmatter("---\ntitle: Test\n---\n");
    expect(result.frontmatter).toEqual({ title: "Test" });
    expect(result.body).toBe("");
  });

  it("handles invalid YAML in frontmatter gracefully", () => {
    const result = parseFrontmatter("---\n: invalid: yaml:\n---\nBody");
    // Should return null frontmatter on parse error
    expect(result.frontmatter).toBeNull();
    expect(result.body).toContain("invalid");
  });

  it("handles empty frontmatter block", () => {
    const result = parseFrontmatter("---\n\n---\nBody content");
    expect(result.body).toBe("Body content");
  });

  it("hasFrontmatter rejects content that only starts with ---", () => {
    expect(hasFrontmatter("---\nJust dashes, no closing")).toBe(false);
  });

  it("addFrontmatter produces parseable output", () => {
    const data = { title: "My Page", tags: ["a", "b"], draft: true };
    const result = addFrontmatter("The body.", data);
    const parsed = parseFrontmatter(result);
    expect(parsed.frontmatter).toEqual(data);
    expect(parsed.body.trim()).toBe("The body.");
  });

  it("parseFrontmatter with complex YAML types", () => {
    const content = "---\ntitle: Test\ncount: 42\nenabled: true\ntags:\n  - a\n  - b\n---\nBody";
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({
      title: "Test",
      count: 42,
      enabled: true,
      tags: ["a", "b"],
    });
  });
});
