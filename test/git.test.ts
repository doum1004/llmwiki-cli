import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import * as git from "../src/lib/git.ts";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-git-"));
  await git.init(testDir);
  // Configure git user for commits
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const exec = promisify(execFile);
  await exec("git", ["config", "user.email", "test@test.com"], { cwd: testDir });
  await exec("git", ["config", "user.name", "Test"], { cwd: testDir });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("git operations", () => {
  it("commit with changes creates commit", async () => {
    await writeFile(join(testDir, "test.md"), "content", "utf-8");
    await git.addAll(testDir);
    const result = await git.commit(testDir, "test commit");
    expect(result.ok).toBe(true);
    expect(result.output).toContain("test commit");
  });

  it("commit with no changes reports nothing to commit", async () => {
    // Make an initial commit first
    await writeFile(join(testDir, "init.md"), "init", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "initial");

    // Try committing with no changes
    const result = await git.commit(testDir, "empty");
    expect(result.ok).toBe(false);
    expect(result.output).toContain("nothing to commit");
  });

  it("log returns formatted history", async () => {
    await writeFile(join(testDir, "a.md"), "a", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "first commit");

    await writeFile(join(testDir, "b.md"), "b", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "second commit");

    const result = await git.log(testDir);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("first commit");
    expect(result.output).toContain("second commit");
  });

  it("logFile shows history for specific file", async () => {
    await writeFile(join(testDir, "a.md"), "a", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "add a");

    await writeFile(join(testDir, "b.md"), "b", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "add b");

    const result = await git.logFile(testDir, "a.md");
    expect(result.ok).toBe(true);
    expect(result.output).toContain("add a");
    expect(result.output).not.toContain("add b");
  });

  it("diff shows uncommitted changes", async () => {
    await writeFile(join(testDir, "file.md"), "original", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "initial");

    await writeFile(join(testDir, "file.md"), "modified", "utf-8");
    const result = await git.diff(testDir);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("modified");
  });

  it("hasRemote returns false for local repo", async () => {
    const result = await git.hasRemote(testDir);
    expect(result).toBe(false);
  });

  it("commit message with special characters", async () => {
    await writeFile(join(testDir, "test.md"), "content", "utf-8");
    await git.addAll(testDir);
    const result = await git.commit(testDir, 'fix: handle "quotes" & <angles>');
    expect(result.ok).toBe(true);
    const logResult = await git.log(testDir);
    expect(logResult.output).toContain("fix: handle");
  });

  it("log respects limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      await writeFile(join(testDir, `f${i}.md`), `content ${i}`, "utf-8");
      await git.addAll(testDir);
      await git.commit(testDir, `commit ${i}`);
    }
    const result = await git.log(testDir, 2);
    expect(result.ok).toBe(true);
    const lines = result.output.split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it("log on empty repo returns error", async () => {
    const result = await git.log(testDir);
    expect(result.ok).toBe(false);
  });

  it("diff with ref shows specific commit", async () => {
    await writeFile(join(testDir, "file.md"), "v1", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "first");

    await writeFile(join(testDir, "file.md"), "v2", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "second");

    const logResult = await git.log(testDir, 1);
    const hash = logResult.output.split(" ")[0]!;
    const result = await git.diff(testDir, hash);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("second");
  });

  it("diff with no changes returns empty output", async () => {
    await writeFile(join(testDir, "file.md"), "content", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "initial");

    const result = await git.diff(testDir);
    expect(result.ok).toBe(true);
    expect(result.output).toBe("");
  });

  it("currentBranch returns branch name", async () => {
    await writeFile(join(testDir, "init.md"), "init", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "initial");

    const branch = await git.currentBranch(testDir);
    expect(["main", "master"]).toContain(branch);
  });

  it("addRemote adds a remote", async () => {
    const result = await git.addRemote(testDir, "origin", "https://example.com/repo.git");
    expect(result.ok).toBe(true);
    const hasRemoteNow = await git.hasRemote(testDir);
    expect(hasRemoteNow).toBe(true);
  });

  it("addAll stages file deletions", async () => {
    await writeFile(join(testDir, "delete-me.md"), "to be deleted", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "add file");

    const { rm: rmFile } = await import("fs/promises");
    await rmFile(join(testDir, "delete-me.md"));
    await git.addAll(testDir);
    const result = await git.commit(testDir, "delete file");
    expect(result.ok).toBe(true);
  });

  it("hasConflicts returns false when no conflicts", async () => {
    await writeFile(join(testDir, "file.md"), "content", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "initial");

    const result = await git.hasConflicts(testDir);
    expect(result).toBe(false);
  });

  it("logFile returns empty for file with no commits", async () => {
    await writeFile(join(testDir, "a.md"), "a", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "add a");

    const result = await git.logFile(testDir, "nonexistent.md");
    expect(result.output).toBe("");
  });

  it("renameCurrentBranchToMain leaves branch named main", async () => {
    await writeFile(join(testDir, "f.md"), "x", "utf-8");
    await git.addAll(testDir);
    await git.commit(testDir, "c");
    const r = await git.renameCurrentBranchToMain(testDir);
    expect(r.ok).toBe(true);
    expect(await git.currentBranch(testDir)).toBe("main");
  });
});
