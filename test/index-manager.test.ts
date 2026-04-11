import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { IndexManager } from "../src/lib/index-manager.ts";

let testDir: string;
let indexPath: string;
let mgr: IndexManager;

const INITIAL_INDEX = `# Index

## Sources

## Entities

## Concepts

## Synthesis
`;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-idx-"));
  indexPath = join(testDir, "index.md");
  await writeFile(indexPath, INITIAL_INDEX, "utf-8");
  mgr = new IndexManager(indexPath);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("IndexManager", () => {
  it("read returns index content", async () => {
    const content = await mgr.read();
    expect(content).toContain("## Sources");
  });

  it("addEntry inserts under correct section from path", async () => {
    await mgr.addEntry("sources/paper.md", "A paper summary");
    const content = await mgr.read();
    expect(content).toContain("- [[sources/paper.md]] — A paper summary");
    // Should be under Sources section
    const sourcesIdx = content.indexOf("## Sources");
    const entryIdx = content.indexOf("[[sources/paper.md]]");
    const entitiesIdx = content.indexOf("## Entities");
    expect(entryIdx).toBeGreaterThan(sourcesIdx);
    expect(entryIdx).toBeLessThan(entitiesIdx);
  });

  it("addEntry puts entities under Entities section", async () => {
    await mgr.addEntry("entities/google.md", "Google LLC");
    const content = await mgr.read();
    const entitiesIdx = content.indexOf("## Entities");
    const entryIdx = content.indexOf("[[entities/google.md]]");
    const conceptsIdx = content.indexOf("## Concepts");
    expect(entryIdx).toBeGreaterThan(entitiesIdx);
    expect(entryIdx).toBeLessThan(conceptsIdx);
  });

  it("addEntry defaults to Concepts for unknown paths", async () => {
    await mgr.addEntry("misc/note.md", "A random note");
    const content = await mgr.read();
    const conceptsIdx = content.indexOf("## Concepts");
    const entryIdx = content.indexOf("[[misc/note.md]]");
    expect(entryIdx).toBeGreaterThan(conceptsIdx);
  });

  it("multiple entries in same section", async () => {
    await mgr.addEntry("concepts/attention.md", "Attention mechanism");
    await mgr.addEntry("concepts/transformers.md", "Transformer architecture");
    const content = await mgr.read();
    expect(content).toContain("[[concepts/attention.md]]");
    expect(content).toContain("[[concepts/transformers.md]]");
  });

  it("removeEntry removes the correct line", async () => {
    await mgr.addEntry("concepts/foo.md", "Foo concept");
    await mgr.addEntry("concepts/bar.md", "Bar concept");
    const removed = await mgr.removeEntry("concepts/foo.md");
    expect(removed).toBe(true);
    const content = await mgr.read();
    expect(content).not.toContain("[[concepts/foo.md]]");
    expect(content).toContain("[[concepts/bar.md]]");
  });

  it("removeEntry returns false for missing entry", async () => {
    const removed = await mgr.removeEntry("nonexistent.md");
    expect(removed).toBe(false);
  });

  it("hasEntry returns true for existing entry", async () => {
    await mgr.addEntry("sources/test.md", "Test");
    expect(await mgr.hasEntry("sources/test.md")).toBe(true);
  });

  it("hasEntry returns false for missing entry", async () => {
    expect(await mgr.hasEntry("nope.md")).toBe(false);
  });

  it("creates section if it does not exist", async () => {
    // Start with an empty file
    await writeFile(indexPath, "# Index\n", "utf-8");
    mgr = new IndexManager(indexPath);
    await mgr.addEntry("sources/new.md", "New source");
    const content = await mgr.read();
    expect(content).toContain("## Sources");
    expect(content).toContain("[[sources/new.md]]");
  });

  it("addEntry routes synthesis paths correctly", async () => {
    await mgr.addEntry("synthesis/overview.md", "Overview doc");
    const content = await mgr.read();
    const synthesisIdx = content.indexOf("## Synthesis");
    const entryIdx = content.indexOf("[[synthesis/overview.md]]");
    expect(entryIdx).toBeGreaterThan(synthesisIdx);
  });

  it("addEntry handles duplicate paths", async () => {
    await mgr.addEntry("concepts/dup.md", "First add");
    await mgr.addEntry("concepts/dup.md", "Second add");
    const content = await mgr.read();
    const matches = content.match(/\[\[concepts\/dup\.md\]\]/g);
    expect(matches).toHaveLength(2);
  });

  it("read returns empty string for missing file", async () => {
    const missingMgr = new IndexManager(join(testDir, "nonexistent.md"));
    const content = await missingMgr.read();
    expect(content).toBe("");
  });

  it("hasEntry is false after removeEntry", async () => {
    await mgr.addEntry("concepts/temp.md", "Temporary");
    expect(await mgr.hasEntry("concepts/temp.md")).toBe(true);
    await mgr.removeEntry("concepts/temp.md");
    expect(await mgr.hasEntry("concepts/temp.md")).toBe(false);
  });

  it("removeEntry preserves other entries in same section", async () => {
    await mgr.addEntry("concepts/keep.md", "Keep this");
    await mgr.addEntry("concepts/remove.md", "Remove this");
    await mgr.addEntry("concepts/also-keep.md", "Also keep");
    await mgr.removeEntry("concepts/remove.md");
    const content = await mgr.read();
    expect(content).toContain("[[concepts/keep.md]]");
    expect(content).toContain("[[concepts/also-keep.md]]");
    expect(content).not.toContain("[[concepts/remove.md]]");
  });

  it("categoryFromPath matches case-insensitively", async () => {
    await mgr.addEntry("Sources/paper.md", "Paper");
    const content = await mgr.read();
    const sourcesIdx = content.indexOf("## Sources");
    const entryIdx = content.indexOf("[[Sources/paper.md]]");
    const entitiesIdx = content.indexOf("## Entities");
    expect(entryIdx).toBeGreaterThan(sourcesIdx);
    expect(entryIdx).toBeLessThan(entitiesIdx);
  });
});
