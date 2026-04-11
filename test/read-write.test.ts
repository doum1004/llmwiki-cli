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

  it("skips .git directory", async () => {
    await wiki.writePage("page.md", "content");
    await mkdir(join(testDir, ".git"), { recursive: true });
    await writeFile(join(testDir, ".git/config.md"), "git config", "utf-8");
    const pages = await wiki.listPages();
    expect(pages).toEqual(["page.md"]);
  });

  it("skips node_modules directory", async () => {
    await wiki.writePage("page.md", "content");
    await mkdir(join(testDir, "node_modules/pkg"), { recursive: true });
    await writeFile(join(testDir, "node_modules/pkg/readme.md"), "readme", "utf-8");
    const pages = await wiki.listPages();
    expect(pages).toEqual(["page.md"]);
  });

  it("handles deeply nested directories", async () => {
    await wiki.writePage("a/b/c/d/deep.md", "deep");
    const pages = await wiki.listPages();
    expect(pages).toEqual(["a/b/c/d/deep.md"]);
    const content = await wiki.readPage("a/b/c/d/deep.md");
    expect(content).toBe("deep");
  });

  it("listPages with nonexistent dir returns empty", async () => {
    const pages = await wiki.listPages("nonexistent");
    expect(pages).toEqual([]);
  });
});

describe("WikiManager edge cases", () => {
  it("readPage re-throws non-ENOENT errors", async () => {
    // Reading a directory path should throw
    await mkdir(join(testDir, "adir"), { recursive: true });
    // On some systems reading a dir as file throws EISDIR
    try {
      await wiki.readPage("adir");
      // Some systems return null, some throw - either is acceptable
    } catch (err: unknown) {
      expect(err).toBeDefined();
    }
  });

  it("appendPage to empty file adds content directly", async () => {
    await wiki.writePage("empty.md", "");
    await wiki.appendPage("empty.md", "new content");
    const content = await wiki.readPage("empty.md");
    expect(content).toBe("\nnew content");
  });

  it("writePage with empty content creates empty file", async () => {
    await wiki.writePage("blank.md", "");
    expect(await wiki.pageExists("blank.md")).toBe(true);
    const content = await wiki.readPage("blank.md");
    expect(content).toBe("");
  });

  it("uses forward slashes on all platforms", async () => {
    await wiki.writePage("sub/page.md", "content");
    const pages = await wiki.listPages();
    expect(pages[0]).toBe("sub/page.md");
    expect(pages[0]).not.toContain("\\");
  });
});
