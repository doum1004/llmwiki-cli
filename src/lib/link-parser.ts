import type { WikiManager } from "./wiki.ts";

const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

export interface LinkGraph {
  pages: Map<string, { outbound: string[]; inbound: string[] }>;
  brokenLinks: Array<{ source: string; target: string }>;
  orphans: string[];
}

const EXCLUDED_FROM_ORPHANS = new Set(["wiki/index.md", "wiki/log.md", "index.md", "log.md"]);

export function extractWikilinks(content: string): string[] {
  const links: string[] = [];
  let match;
  const regex = new RegExp(WIKILINK_REGEX.source, "g");
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]!);
  }
  return links;
}

async function resolveLink(
  wiki: WikiManager,
  target: string,
  allPages: string[],
): Promise<string | null> {
  // Exact match (with .md extension)
  const withMd = target.endsWith(".md") ? target : target + ".md";

  // Check exact path
  if (allPages.includes(withMd)) return withMd;

  // Check with wiki/ prefix
  const withWiki = "wiki/" + withMd;
  if (allPages.includes(withWiki)) return withWiki;

  // Check in subdirectories
  const dirs = ["wiki/entities", "wiki/concepts", "wiki/sources", "wiki/synthesis"];
  for (const dir of dirs) {
    const candidate = dir + "/" + withMd;
    if (allPages.includes(candidate)) return candidate;
  }

  // Check by filename only (anywhere in wiki)
  const basename = withMd.split("/").pop()!;
  const found = allPages.find((p) => p.endsWith("/" + basename) || p === basename);
  if (found) return found;

  return null;
}

export async function buildLinkGraph(wiki: WikiManager): Promise<LinkGraph> {
  const allPages = await wiki.listPages();
  const pages = new Map<string, { outbound: string[]; inbound: string[] }>();
  const brokenLinks: Array<{ source: string; target: string }> = [];

  // Initialize all pages
  for (const page of allPages) {
    pages.set(page, { outbound: [], inbound: [] });
  }

  // Build outbound links and resolve them
  for (const page of allPages) {
    const content = await wiki.readPage(page);
    if (!content) continue;

    const links = extractWikilinks(content);
    const pageData = pages.get(page)!;

    for (const target of links) {
      const resolved = await resolveLink(wiki, target, allPages);
      if (resolved) {
        pageData.outbound.push(resolved);
        const targetData = pages.get(resolved);
        if (targetData) {
          targetData.inbound.push(page);
        }
      } else {
        brokenLinks.push({ source: page, target });
      }
    }
  }

  // Find orphans (pages with 0 inbound links, excluding index/log)
  const orphans: string[] = [];
  for (const [page, data] of pages) {
    if (data.inbound.length === 0 && !isExcludedFromOrphans(page)) {
      orphans.push(page);
    }
  }

  return { pages, brokenLinks, orphans };
}

function isExcludedFromOrphans(page: string): boolean {
  if (EXCLUDED_FROM_ORPHANS.has(page)) return true;
  const basename = page.split("/").pop()!;
  return EXCLUDED_FROM_ORPHANS.has(basename);
}
