import { WikiManager } from "./wiki.ts";
import * as git from "./git.ts";
import type { StorageProvider } from "../types.ts";

export class GitProvider implements StorageProvider {
  private wiki: WikiManager;
  /** Repository root (git operations). */
  public readonly root: string;
  private gitConfig?: { token: string; repo: string };

  /**
   * @param root Git repository root (for commit/push).
   * @param gitConfig Optional remote credentials.
   * @param wikiDataRoot Directory for markdown I/O; defaults to `root`. Use `join(root, "profiles", slug)` for profiles.
   */
  constructor(
    root: string,
    gitConfig?: { token: string; repo: string },
    wikiDataRoot?: string,
  ) {
    this.root = root;
    this.wiki = new WikiManager(wikiDataRoot ?? root);
    this.gitConfig = gitConfig;
  }

  async readPage(relativePath: string): Promise<string | null> {
    return this.wiki.readPage(relativePath);
  }

  async writePage(relativePath: string, content: string): Promise<void> {
    await this.wiki.writePage(relativePath, content);
    await this.autoCommit(`update ${relativePath}`);
  }

  async appendPage(relativePath: string, content: string): Promise<boolean> {
    const ok = await this.wiki.appendPage(relativePath, content);
    if (ok) {
      await this.autoCommit(`append to ${relativePath}`);
    }
    return ok;
  }

  async pageExists(relativePath: string): Promise<boolean> {
    return this.wiki.pageExists(relativePath);
  }

  async listPages(dir?: string): Promise<string[]> {
    return this.wiki.listPages(dir);
  }

  private async autoCommit(message: string): Promise<void> {
    await git.addAll(this.root);
    await git.commit(this.root, message);
    if (this.gitConfig) {
      const branch = await git.currentBranch(this.root);
      await git.push(this.root, "origin", branch);
    }
  }
}
