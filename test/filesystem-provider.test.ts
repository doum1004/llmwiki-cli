import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { WikiManager } from "../src/lib/wiki.ts";
import type { StorageProvider } from "../src/types.ts";

let testDir: string;
let provider: StorageProvider;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-fs-"));
  provider = new WikiManager(testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("FilesystemProvider", () => {
  it("writePage + readPage round-trips content", async () => {
    await provider.writePage("test.md", "hello world");
    const content = await provider.readPage("test.md");
    expect(content).toBe("hello world");
  });

  it("readPage returns null for missing page", async () => {
    const content = await provider.readPage("nonexistent.md");
    expect(content).toBeNull();
  });

  it("pageExists returns false for missing page", async () => {
    expect(await provider.pageExists("nope.md")).toBe(false);
  });

  it("pageExists returns true after write", async () => {
    await provider.writePage("exists.md", "content");
    expect(await provider.pageExists("exists.md")).toBe(true);
  });

  it("appendPage returns false for missing page", async () => {
    const ok = await provider.appendPage("missing.md", "more");
    expect(ok).toBe(false);
  });

  it("appendPage appends to existing page", async () => {
    await provider.writePage("page.md", "first\n");
    const ok = await provider.appendPage("page.md", "second");
    expect(ok).toBe(true);
    const content = await provider.readPage("page.md");
    expect(content).toBe("first\nsecond");
  });

  it("listPages returns written markdown files", async () => {
    await provider.writePage("a.md", "a");
    await provider.writePage("sub/b.md", "b");
    const pages = await provider.listPages();
    expect(pages).toContain("a.md");
    expect(pages).toContain("sub/b.md");
  });

  it("listPages with dir scopes to subdirectory", async () => {
    await provider.writePage("root.md", "r");
    await provider.writePage("sub/child.md", "c");
    const pages = await provider.listPages("sub");
    expect(pages).toContain("sub/child.md");
    expect(pages).not.toContain("root.md");
  });

  it("deletePage removes file", async () => {
    await provider.writePage("del.md", "x");
    await provider.deletePage("del.md");
    expect(await provider.pageExists("del.md")).toBe(false);
  });
});
