import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createProvider } from "../src/lib/storage.ts";
import { GitProvider } from "../src/lib/git-provider.ts";
import * as git from "../src/lib/git.ts";
import type { StorageProvider, WikiConfig } from "../src/types.ts";

function makeConfig(backend: WikiConfig["backend"] = "filesystem"): WikiConfig {
  return {
    name: "test",
    domain: "general",
    created: new Date().toISOString(),
    backend,
    paths: { raw: "raw", wiki: "wiki", schema: "SCHEMA.md" },
  };
}

let testDir: string;
let provider: StorageProvider;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-storage-"));
  provider = await createProvider(makeConfig("filesystem"), testDir);
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

  it("creates a git provider", async () => {
    const gitProvider = await createProvider(makeConfig("git"), testDir);
    expect(gitProvider).toBeInstanceOf(GitProvider);
  });

  it("rejects supabase without credentials", async () => {
    expect(
      createProvider(makeConfig("supabase"), testDir),
    ).rejects.toThrow("Supabase config missing");
  });

  it("throws for unknown backend", async () => {
    expect(
      createProvider(makeConfig("unknown" as any), testDir),
    ).rejects.toThrow('Unknown storage backend: "unknown"');
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

describe("GitProvider", () => {
  let gitDir: string;
  let gitProvider: StorageProvider;

  beforeEach(async () => {
    gitDir = await mkdtemp(join(tmpdir(), "llmwiki-git-"));
    await git.init(gitDir);
    gitProvider = await createProvider(makeConfig("git"), gitDir);
  });

  afterEach(async () => {
    await rm(gitDir, { recursive: true, force: true });
  });

  it("writePage stores content and auto-commits", async () => {
    await gitProvider.writePage("test.md", "hello");
    const content = await gitProvider.readPage("test.md");
    expect(content).toBe("hello");
    const log = await git.log(gitDir, 1);
    expect(log.ok).toBe(true);
    expect(log.output).toContain("update test.md");
  });

  it("appendPage auto-commits on success", async () => {
    await gitProvider.writePage("page.md", "first\n");
    await gitProvider.appendPage("page.md", "second");
    const log = await git.log(gitDir, 2);
    expect(log.ok).toBe(true);
    expect(log.output).toContain("append to page.md");
  });

  it("appendPage does not commit on missing page", async () => {
    const ok = await gitProvider.appendPage("missing.md", "nope");
    expect(ok).toBe(false);
    const log = await git.log(gitDir, 1);
    expect(log.output).not.toContain("append to missing.md");
  });

  it("readPage returns null for missing page", async () => {
    const content = await gitProvider.readPage("nope.md");
    expect(content).toBeNull();
  });

  it("listPages works like filesystem", async () => {
    await gitProvider.writePage("a.md", "a");
    await gitProvider.writePage("sub/b.md", "b");
    const pages = await gitProvider.listPages();
    expect(pages).toContain("a.md");
    expect(pages).toContain("sub/b.md");
  });
});
