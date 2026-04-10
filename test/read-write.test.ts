import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { WikiManager } from "../src/lib/wiki.ts";

let testDir: string;
let wiki: WikiManager;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-rw-"));
  wiki = new WikiManager(testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("WikiManager.writePage", () => {
  it("creates file with correct content", async () => {
    await wiki.writePage("test.md", "# Hello\n");
    const content = await readFile(join(testDir, "test.md"), "utf-8");
    expect(content).toBe("# Hello\n");
  });

  it("creates parent directories automatically", async () => {
    await wiki.writePage("wiki/concepts/deep.md", "content");
    const content = await readFile(
      join(testDir, "wiki/concepts/deep.md"),
      "utf-8",
    );
    expect(content).toBe("content");
  });

  it("overwrites existing file", async () => {
    await wiki.writePage("page.md", "old");
    await wiki.writePage("page.md", "new");
    const content = await wiki.readPage("page.md");
    expect(content).toBe("new");
  });
});

describe("WikiManager.readPage", () => {
  it("returns file content", async () => {
    await writeFile(join(testDir, "hello.md"), "world", "utf-8");
    const content = await wiki.readPage("hello.md");
    expect(content).toBe("world");
  });

  it("returns null for missing file", async () => {
    const content = await wiki.readPage("nonexistent.md");
    expect(content).toBeNull();
  });
});

describe("WikiManager.appendPage", () => {
  it("appends to existing file", async () => {
    await wiki.writePage("page.md", "line1\n");
    const ok = await wiki.appendPage("page.md", "line2\n");
    expect(ok).toBe(true);
    const content = await wiki.readPage("page.md");
    expect(content).toBe("line1\nline2\n");
  });

  it("adds newline separator if missing", async () => {
    await wiki.writePage("page.md", "no-newline");
    await wiki.appendPage("page.md", "more");
    const content = await wiki.readPage("page.md");
    expect(content).toBe("no-newline\nmore");
  });

  it("returns false for missing file", async () => {
    const ok = await wiki.appendPage("missing.md", "content");
    expect(ok).toBe(false);
  });
});

describe("WikiManager.pageExists", () => {
  it("returns true for existing file", async () => {
    await wiki.writePage("exists.md", "hi");
    expect(await wiki.pageExists("exists.md")).toBe(true);
  });

  it("returns false for missing file", async () => {
    expect(await wiki.pageExists("nope.md")).toBe(false);
  });
});

describe("WikiManager.listPages", () => {
  it("returns all .md files", async () => {
    await wiki.writePage("a.md", "a");
    await wiki.writePage("b.md", "b");
    await wiki.writePage("sub/c.md", "c");
    const pages = await wiki.listPages();
    expect(pages).toEqual(["a.md", "b.md", "sub/c.md"]);
  });

  it("filters by subdirectory", async () => {
    await wiki.writePage("root.md", "r");
    await wiki.writePage("wiki/page.md", "p");
    await wiki.writePage("wiki/sub/deep.md", "d");
    const pages = await wiki.listPages("wiki");
    expect(pages).toEqual(["wiki/page.md", "wiki/sub/deep.md"]);
  });

  it("returns empty array for empty dir", async () => {
    const pages = await wiki.listPages();
    expect(pages).toEqual([]);
  });

  it("skips non-.md files", async () => {
    await writeFile(join(testDir, "notes.txt"), "text", "utf-8");
    await wiki.writePage("page.md", "md");
    const pages = await wiki.listPages();
    expect(pages).toEqual(["page.md"]);
  });

  it("returns sorted results", async () => {
    await wiki.writePage("z.md", "z");
    await wiki.writePage("a.md", "a");
    await wiki.writePage("m.md", "m");
    const pages = await wiki.listPages();
    expect(pages).toEqual(["a.md", "m.md", "z.md"]);
  });
});
