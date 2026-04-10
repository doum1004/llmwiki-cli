import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { WikiManager } from "../src/lib/wiki.ts";
import { extractWikilinks, buildLinkGraph } from "../src/lib/link-parser.ts";

let testDir: string;
let wiki: WikiManager;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-links-"));
  wiki = new WikiManager(testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("extractWikilinks", () => {
  it("extracts simple wikilinks", () => {
    const links = extractWikilinks("See [[attention]] and [[transformers]].");
    expect(links).toEqual(["attention", "transformers"]);
  });

  it("handles [[target|display]] format", () => {
    const links = extractWikilinks("See [[attention|Attention Mechanism]].");
    expect(links).toEqual(["attention"]);
  });

  it("extracts links with paths", () => {
    const links = extractWikilinks("See [[concepts/attention.md]].");
    expect(links).toEqual(["concepts/attention.md"]);
  });

  it("returns empty array for no links", () => {
    const links = extractWikilinks("No links here.");
    expect(links).toEqual([]);
  });

  it("handles multiple links on same line", () => {
    const links = extractWikilinks("[[a]] and [[b]] and [[c]]");
    expect(links).toEqual(["a", "b", "c"]);
  });
});

describe("buildLinkGraph", () => {
  it("builds correct outbound and inbound links", async () => {
    await wiki.writePage("a.md", "Links to [[b]].");
    await wiki.writePage("b.md", "Links to [[a]].");

    const graph = await buildLinkGraph(wiki);
    const aData = graph.pages.get("a.md")!;
    const bData = graph.pages.get("b.md")!;

    expect(aData.outbound).toEqual(["b.md"]);
    expect(aData.inbound).toEqual(["b.md"]);
    expect(bData.outbound).toEqual(["a.md"]);
    expect(bData.inbound).toEqual(["a.md"]);
  });

  it("detects broken links", async () => {
    await wiki.writePage("a.md", "Links to [[nonexistent]].");

    const graph = await buildLinkGraph(wiki);
    expect(graph.brokenLinks).toHaveLength(1);
    expect(graph.brokenLinks[0]!.source).toBe("a.md");
    expect(graph.brokenLinks[0]!.target).toBe("nonexistent");
  });

  it("finds orphan pages", async () => {
    await wiki.writePage("a.md", "Links to [[b]].");
    await wiki.writePage("b.md", "Has inbound link.");
    await wiki.writePage("c.md", "No one links here.");

    const graph = await buildLinkGraph(wiki);
    expect(graph.orphans).toContain("a.md");
    expect(graph.orphans).toContain("c.md");
    expect(graph.orphans).not.toContain("b.md");
  });

  it("excludes index.md and log.md from orphans", async () => {
    await wiki.writePage("wiki/index.md", "Index page.");
    await wiki.writePage("wiki/log.md", "Log page.");
    await wiki.writePage("wiki/concepts/a.md", "A page.");

    const graph = await buildLinkGraph(wiki);
    expect(graph.orphans).not.toContain("wiki/index.md");
    expect(graph.orphans).not.toContain("wiki/log.md");
    expect(graph.orphans).toContain("wiki/concepts/a.md");
  });

  it("resolves links by filename across directories", async () => {
    await wiki.writePage(
      "wiki/sources/paper.md",
      "Mentions [[attention]].",
    );
    await wiki.writePage("wiki/concepts/attention.md", "The concept.");

    const graph = await buildLinkGraph(wiki);
    const paperData = graph.pages.get("wiki/sources/paper.md")!;
    expect(paperData.outbound).toEqual(["wiki/concepts/attention.md"]);
    expect(graph.brokenLinks).toHaveLength(0);
  });

  it("returns empty graph for empty wiki", async () => {
    const graph = await buildLinkGraph(wiki);
    expect(graph.pages.size).toBe(0);
    expect(graph.brokenLinks).toHaveLength(0);
    expect(graph.orphans).toHaveLength(0);
  });
});
