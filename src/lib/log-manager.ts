import type { StorageProvider } from "../types.ts";

export class LogManager {
  constructor(
    private readonly provider: StorageProvider,
    private readonly pagePath: string = "wiki/log.md",
  ) {}

  async append(type: string, message: string): Promise<void> {
    let content = await this.readRaw();
    const now = new Date()
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, "");
    const entry = `## [${now}] ${type} | ${message}\n`;
    const separator = content.endsWith("\n") ? "" : "\n";
    content = content + separator + "\n" + entry;
    await this.provider.writePage(this.pagePath, content);
  }

  async show(options?: {
    last?: number;
    type?: string;
  }): Promise<string[]> {
    const content = await this.readRaw();
    // Split by entry headers
    const entries: string[] = [];
    const lines = content.split("\n");

    let current = "";
    for (const line of lines) {
      if (line.startsWith("## [")) {
        if (current) entries.push(current.trim());
        current = line;
      } else if (current) {
        current += "\n" + line;
      }
    }
    if (current) entries.push(current.trim());

    let filtered = entries;

    if (options?.type) {
      const typeFilter = options.type.toLowerCase();
      filtered = filtered.filter((e) => {
        const match = e.match(/## \[.*?\] (\S+)/);
        return match && match[1]!.toLowerCase() === typeFilter;
      });
    }

    if (options?.last) {
      filtered = filtered.slice(-options.last);
    }

    return filtered;
  }

  private async readRaw(): Promise<string> {
    return (await this.provider.readPage(this.pagePath)) ?? "";
  }
}
