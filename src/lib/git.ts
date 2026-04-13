import { execFile } from "child_process";

export interface GitResult {
  ok: boolean;
  output: string;
}

function run(args: string[], cwd: string): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile("git", args, { cwd }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, output: (stdout || stderr || err.message).trim() });
      } else {
        resolve({ ok: true, output: stdout.trim() });
      }
    });
  });
}

export function init(cwd: string): Promise<GitResult> {
  return run(["init"], cwd);
}

/** Rename the current branch to `main` (GitHub Pages + `github-pages` env default rules expect `main`). */
export function renameCurrentBranchToMain(cwd: string): Promise<GitResult> {
  return run(["branch", "-M", "main"], cwd);
}

export function addAll(cwd: string): Promise<GitResult> {
  return run(["add", "-A"], cwd);
}

export function commit(cwd: string, message: string): Promise<GitResult> {
  return run(["commit", "-m", message], cwd);
}

export function log(cwd: string, limit = 20): Promise<GitResult> {
  return run(["log", "--oneline", "-n", String(limit)], cwd);
}

export function logFile(cwd: string, path: string, limit = 20): Promise<GitResult> {
  return run(["log", "--oneline", "-n", String(limit), "--", path], cwd);
}

export function diff(cwd: string, ref?: string): Promise<GitResult> {
  return ref ? run(["show", ref], cwd) : run(["diff"], cwd);
}

export async function currentBranch(cwd: string): Promise<string> {
  const result = await run(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  return result.ok ? result.output : "main";
}

export async function hasRemote(cwd: string): Promise<boolean> {
  const result = await run(["remote"], cwd);
  return result.ok && result.output.length > 0;
}

export function addRemote(cwd: string, name: string, url: string): Promise<GitResult> {
  return run(["remote", "add", name, url], cwd);
}

export function push(cwd: string, remote = "origin", branch = "main"): Promise<GitResult> {
  return run(["push", "-u", remote, branch], cwd);
}

export function fetch(cwd: string, remote = "origin"): Promise<GitResult> {
  return run(["fetch", remote], cwd);
}

export function pull(cwd: string, remote = "origin", branch = "main"): Promise<GitResult> {
  return run(["pull", remote, branch, "--rebase"], cwd);
}

export function pullRebaseAllowUnrelated(cwd: string, remote = "origin", branch = "main"): Promise<GitResult> {
  return run(["pull", remote, branch, "--rebase", "--allow-unrelated-histories"], cwd);
}

export async function hasConflicts(cwd: string): Promise<boolean> {
  const result = await run(["diff", "--name-only", "--diff-filter=U"], cwd);
  return result.ok && result.output.length > 0;
}

export function clone(url: string, dest: string): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile("git", ["clone", url, dest], (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, output: (stdout || stderr || err.message).trim() });
      } else {
        resolve({ ok: true, output: stdout.trim() });
      }
    });
  });
}
