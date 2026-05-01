import { readFile, writeFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { join, relative, dirname } from "path";
import type { StorageProvider } from "../types.ts";

export class WikiManager implements StorageProvider {
  constructor(public readonly root: string) {}

  private resolve(relativePath: string): string {
    return join(this.root, relativePath);
  }

  async readPage(relativePath: string): Promise<string | null> {
    try {
      return await readFile(this.resolve(relativePath), "utf-8");
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return null;
      }
      throw err;
    }
  }

  async writePage(relativePath: string, content: string): Promise<void> {
    const fullPath = this.resolve(relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }

  async appendPage(relativePath: string, content: string): Promise<boolean> {
    const fullPath = this.resolve(relativePath);
    const existing = await this.readPage(relativePath);
    if (existing === null) return false;
    const separator = existing.endsWith("\n") ? "" : "\n";
    await writeFile(fullPath, existing + separator + content, "utf-8");
    return true;
  }

  async deletePage(relativePath: string): Promise<void> {
    await unlink(this.resolve(relativePath));
  }

  async pageExists(relativePath: string): Promise<boolean> {
    try {
      await stat(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async listPages(dir?: string): Promise<string[]> {
    const base = dir ? this.resolve(dir) : this.root;
    const results: string[] = [];
    await this.walkDir(base, results);
    results.sort();
    return results;
  }

  private async walkDir(dir: string, results: string[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        await this.walkDir(fullPath, results);
      } else if (entry.name.endsWith(".md")) {
        results.push(relative(this.root, fullPath).replace(/\\/g, "/"));
      }
    }
  }
}
