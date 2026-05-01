import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createProvider } from "../src/lib/storage.ts";
import type { WikiConfig } from "../src/types.ts";

function makeConfig(): WikiConfig {
  return {
    name: "test",
    domain: "general",
    created: new Date().toISOString(),
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
    const provider = await createProvider(makeConfig(), testDir);
    expect(provider).toBeDefined();
    expect(provider.readPage).toBeInstanceOf(Function);
    expect(provider.writePage).toBeInstanceOf(Function);
    expect(provider.appendPage).toBeInstanceOf(Function);
    expect(provider.deletePage).toBeInstanceOf(Function);
    expect(provider.pageExists).toBeInstanceOf(Function);
    expect(provider.listPages).toBeInstanceOf(Function);
  });

  it("filesystem provider writes under wiki root", async () => {
    const provider = await createProvider(makeConfig(), testDir);
    await provider.writePage("wiki/note.md", "scoped");
    const full = join(testDir, "wiki", "note.md");
    const content = await readFile(full, "utf-8");
    expect(content).toBe("scoped");
  });
});
