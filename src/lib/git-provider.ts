import { WikiManager } from "./wiki.ts";
import * as git from "./git.ts";
import type { StorageProvider } from "../types.ts";

export class GitProvider implements StorageProvider {
  private wiki: WikiManager;
  public readonly root: string;

  constructor(root: string) {
    this.root = root;
    this.wiki = new WikiManager(root);
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
  }
}
