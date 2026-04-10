import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { LogManager } from "../src/lib/log-manager.ts";

let testDir: string;
let logPath: string;
let mgr: LogManager;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-log-"));
  logPath = join(testDir, "log.md");
  await writeFile(logPath, "# Activity Log\n", "utf-8");
  mgr = new LogManager(logPath);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("LogManager", () => {
  it("append creates correctly formatted entry", async () => {
    await mgr.append("ingest", "Added attention paper");
    const entries = await mgr.show();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/## \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] ingest \| Added attention paper/);
  });

  it("show returns all entries", async () => {
    await mgr.append("ingest", "First");
    await mgr.append("query", "Second");
    await mgr.append("maintenance", "Third");
    const entries = await mgr.show();
    expect(entries).toHaveLength(3);
  });

  it("show --last N returns correct count", async () => {
    await mgr.append("ingest", "One");
    await mgr.append("ingest", "Two");
    await mgr.append("ingest", "Three");
    const entries = await mgr.show({ last: 2 });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain("Two");
    expect(entries[1]).toContain("Three");
  });

  it("show --type filters correctly", async () => {
    await mgr.append("ingest", "Paper A");
    await mgr.append("query", "Question B");
    await mgr.append("ingest", "Paper C");
    const entries = await mgr.show({ type: "ingest" });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain("Paper A");
    expect(entries[1]).toContain("Paper C");
  });

  it("show returns empty for no matching type", async () => {
    await mgr.append("ingest", "Something");
    const entries = await mgr.show({ type: "nonexistent" });
    expect(entries).toHaveLength(0);
  });

  it("type filter is case insensitive", async () => {
    await mgr.append("Ingest", "Mixed case");
    const entries = await mgr.show({ type: "ingest" });
    expect(entries).toHaveLength(1);
  });
});
