import type { StorageProvider } from "../types.ts";

export interface SearchResult {
  path: string;
  score: number;
  snippet: string;
}

export async function search(
  wiki: StorageProvider,
  query: string,
  options?: { limit?: number; dir?: string },
): Promise<SearchResult[]> {
  const limit = options?.limit ?? 10;
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) return [];

  const pages = await wiki.listPages(options?.dir);
  const results: SearchResult[] = [];

  for (const path of pages) {
    const content = await wiki.readPage(path);
    if (!content) continue;

    const lower = content.toLowerCase();
    let score = 0;
    let firstIndex = -1;

    for (const term of terms) {
      const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches) {
        score += matches.length;
        if (firstIndex === -1) {
          firstIndex = lower.indexOf(term);
        }
      }
    }

    if (score > 0) {
      const snippet = extractSnippet(content, firstIndex);
      results.push({ path, score, snippet });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function extractSnippet(content: string, matchIndex: number): string {
  const snippetLen = 200;
  const half = Math.floor(snippetLen / 2);

  let start = Math.max(0, matchIndex - half);
  let end = Math.min(content.length, matchIndex + half);

  // Adjust to word boundaries
  if (start > 0) {
    const space = content.indexOf(" ", start);
    if (space !== -1 && space < start + 20) start = space + 1;
  }
  if (end < content.length) {
    const space = content.lastIndexOf(" ", end);
    if (space !== -1 && space > end - 20) end = space;
  }

  let snippet = content.slice(start, end).replace(/\n+/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";
  return snippet;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
