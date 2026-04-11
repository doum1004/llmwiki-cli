import { describe, it, expect, beforeEach } from "bun:test";
import { SupabaseProvider } from "../src/lib/supabase-provider.ts";

// In-memory store simulating Supabase table
let store: Map<string, { wiki_id: string; path: string; content: string }>;

function mockClient() {
  function makeEqChain(wikiId: string, isCount: boolean) {
    return {
      eq(col2: string, val2: string) {
        const key = `${wikiId}:${val2}`;
        if (isCount) {
          const exists = store.has(key);
          return { count: exists ? 1 : 0, error: null };
        }
        return {
          maybeSingle() {
            const row = store.get(key);
            return { data: row ? { content: row.content } : null, error: null };
          },
        };
      },
      like(_col: string, _pattern: string) {
        return {
          order() {
            return { data: [], error: null };
          },
        };
      },
      order(_col: string) {
        const results: { path: string }[] = [];
        for (const row of store.values()) {
          if (row.wiki_id === wikiId) {
            results.push({ path: row.path });
          }
        }
        return { data: results, error: null };
      },
    };
  }

  return {
    from(_table: string) {
      return {
        select(fields: string, opts?: { count?: string; head?: boolean }) {
          const isCount = opts?.count === "exact";
          return {
            eq(col: string, val: string) {
              return makeEqChain(val, isCount);
            },
          };
        },
        upsert(row: any, _opts?: any) {
          const key = `${row.wiki_id}:${row.path}`;
          store.set(key, { wiki_id: row.wiki_id, path: row.path, content: row.content });
          return { error: null };
        },
      };
    },
  };
}

let provider: SupabaseProvider;

beforeEach(() => {
  store = new Map();
  provider = new SupabaseProvider(mockClient(), "test-wiki");
});

describe("SupabaseProvider", () => {
  it("writePage + readPage round-trips content", async () => {
    await provider.writePage("wiki/test.md", "hello world");
    const content = await provider.readPage("wiki/test.md");
    expect(content).toBe("hello world");
  });

  it("readPage returns null for missing page", async () => {
    const content = await provider.readPage("nonexistent.md");
    expect(content).toBeNull();
  });

  it("writePage overwrites existing content", async () => {
    await provider.writePage("wiki/page.md", "v1");
    await provider.writePage("wiki/page.md", "v2");
    const content = await provider.readPage("wiki/page.md");
    expect(content).toBe("v2");
  });

  it("appendPage appends to existing page", async () => {
    await provider.writePage("wiki/page.md", "first\n");
    const ok = await provider.appendPage("wiki/page.md", "second");
    expect(ok).toBe(true);
    const content = await provider.readPage("wiki/page.md");
    expect(content).toBe("first\nsecond");
  });

  it("appendPage returns false for missing page", async () => {
    const ok = await provider.appendPage("missing.md", "nope");
    expect(ok).toBe(false);
  });

  it("pageExists returns false for missing page", async () => {
    expect(await provider.pageExists("nope.md")).toBe(false);
  });

  it("pageExists returns true after write", async () => {
    await provider.writePage("wiki/exists.md", "content");
    expect(await provider.pageExists("wiki/exists.md")).toBe(true);
  });

  it("listPages returns stored pages", async () => {
    await provider.writePage("wiki/a.md", "a");
    await provider.writePage("wiki/b.md", "b");
    const pages = await provider.listPages();
    expect(pages).toContain("wiki/a.md");
    expect(pages).toContain("wiki/b.md");
  });

  it("listPages only returns .md files", async () => {
    await provider.writePage("wiki/page.md", "content");
    await provider.writePage("wiki/image.png", "binary");
    const pages = await provider.listPages();
    expect(pages).toContain("wiki/page.md");
    expect(pages).not.toContain("wiki/image.png");
  });
});
