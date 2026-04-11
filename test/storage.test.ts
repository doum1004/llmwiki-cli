import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createProvider } from "../src/lib/storage.ts";
import type { StorageProvider } from "../src/types.ts";

let testDir: string;
let provider: StorageProvider;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-storage-"));
  provider = createProvider("filesystem", testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("createProvider", () => {
  it("creates a filesystem provider", () => {
    expect(provider).toBeDefined();
    expect(provider.readPage).toBeInstanceOf(Function);
    expect(provider.writePage).toBeInstanceOf(Function);
    expect(provider.appendPage).toBeInstanceOf(Function);
    expect(provider.pageExists).toBeInstanceOf(Function);
    expect(provider.listPages).toBeInstanceOf(Function);
  });

  it("throws for unknown backend", () => {
    expect(() => createProvider("unknown" as any, testDir)).toThrow(
      'Unknown storage backend: "unknown"',
    );
  });
});

describe("StorageProvider contract (filesystem)", () => {
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
});
