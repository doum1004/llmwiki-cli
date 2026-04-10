import { readFile, writeFile } from "fs/promises";

const SECTIONS = ["Sources", "Entities", "Concepts", "Synthesis"] as const;

function categoryFromPath(pagePath: string): string {
  const parts = pagePath.replace(/\\/g, "/").split("/");
  for (const section of SECTIONS) {
    if (parts.some((p) => p.toLowerCase() === section.toLowerCase())) {
      return section;
    }
  }
  return "Concepts"; // default
}

export class IndexManager {
  constructor(private readonly indexPath: string) {}

  async read(): Promise<string> {
    try {
      return await readFile(this.indexPath, "utf-8");
    } catch {
      return "";
    }
  }

  async addEntry(pagePath: string, summary: string): Promise<void> {
    let content = await this.read();
    const section = categoryFromPath(pagePath);
    const entry = `- [[${pagePath}]] — ${summary}`;
    const header = `## ${section}`;

    if (content.includes(header)) {
      // Insert entry after the section header
      const headerIndex = content.indexOf(header);
      const afterHeader = headerIndex + header.length;
      // Find the end of the header line
      const lineEnd = content.indexOf("\n", afterHeader);
      if (lineEnd === -1) {
        content = content + "\n" + entry + "\n";
      } else {
        content =
          content.slice(0, lineEnd + 1) +
          entry +
          "\n" +
          content.slice(lineEnd + 1);
      }
    } else {
      // Create section at end of file
      const separator = content.endsWith("\n") ? "" : "\n";
      content = content + separator + "\n" + header + "\n" + entry + "\n";
    }

    await writeFile(this.indexPath, content, "utf-8");
  }

  async removeEntry(pagePath: string): Promise<boolean> {
    const content = await this.read();
    const pattern = `[[${pagePath}]]`;
    const lines = content.split("\n");
    const filtered = lines.filter((line) => !line.includes(pattern));

    if (filtered.length === lines.length) return false;

    await writeFile(this.indexPath, filtered.join("\n"), "utf-8");
    return true;
  }

  async hasEntry(pagePath: string): Promise<boolean> {
    const content = await this.read();
    return content.includes(`[[${pagePath}]]`);
  }
}
