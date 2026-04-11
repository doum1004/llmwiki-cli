import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { GitProvider } from "../src/lib/git-provider.ts";
import * as git from "../src/lib/git.ts";
import type { StorageProvider } from "../src/types.ts";

const exec = promisify(execFile);

let gitDir: string;
let gitProvider: StorageProvider;

beforeEach(async () => {
  gitDir = await mkdtemp(join(tmpdir(), "llmwiki-git-"));
  await git.init(gitDir);
  // Configure git user for CI environments
  await exec("git", ["config", "user.name", "Test"], { cwd: gitDir });
  await exec("git", ["config", "user.email", "test@test.com"], { cwd: gitDir });
  gitProvider = new GitProvider(gitDir);
});

afterEach(async () => {
  await rm(gitDir, { recursive: true, force: true });
});

describe("GitProvider", () => {
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
