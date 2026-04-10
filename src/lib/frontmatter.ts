import * as yaml from "js-yaml";

export interface ParsedPage {
  frontmatter: Record<string, unknown> | null;
  body: string;
}

const FM_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(content: string): ParsedPage {
  const match = content.match(FM_REGEX);
  if (!match) {
    return { frontmatter: null, body: content };
  }
  try {
    const frontmatter = yaml.load(match[1]!) as Record<string, unknown>;
    return { frontmatter, body: match[2]! };
  } catch {
    return { frontmatter: null, body: content };
  }
}

export function hasFrontmatter(content: string): boolean {
  return FM_REGEX.test(content);
}

export function addFrontmatter(
  content: string,
  data: Record<string, unknown>,
): string {
  const fm = yaml.dump(data, { lineWidth: 120, sortKeys: false }).trim();
  return `---\n${fm}\n---\n\n${content}`;
}
