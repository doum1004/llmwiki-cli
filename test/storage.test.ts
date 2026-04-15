import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createProvider } from "../src/lib/storage.ts";
import { GitProvider } from "../src/lib/git-provider.ts";
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

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-storage-"));
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("createProvider", () => {
  it("creates a filesystem provider", async () => {
    const provider = await createProvider(makeConfig("filesystem"), testDir);
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

  it("filesystem provider with storageProfile writes under profiles/slug", async () => {
    const provider = await createProvider(makeConfig("filesystem"), testDir, {
      storageProfile: "alice",
    });
    await provider.writePage("wiki/note.md", "scoped");
    const full = join(testDir, "profiles", "alice", "wiki", "note.md");
    const content = await readFile(full, "utf-8");
    expect(content).toBe("scoped");
  });

  it("throws for unknown backend", async () => {
    expect(
      createProvider(makeConfig("unknown" as any), testDir),
    ).rejects.toThrow('Unknown storage backend: "unknown"');
  });
});
