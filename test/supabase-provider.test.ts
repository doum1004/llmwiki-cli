import { describe, it, expect, beforeEach } from "bun:test";
import { SupabaseProvider } from "../src/lib/supabase-provider.ts";

type Row = { user_id: string | null; wiki_id: string; path: string; content: string };

let store: Map<string, Row>;

function rowKey(userId: string | null, wikiId: string, path: string): string {
  const u = userId === null ? "__GLOBAL__" : userId;
  return `${u}\0${wikiId}\0${path}`;
}

function keyFromFilters(f: Record<string, string>): string {
  const wikiId = f.wiki_id ?? "";
  const path = f.path ?? "";
  if (f.__user_id_is_null) return rowKey(null, wikiId, path);
  return rowKey(f.user_id ?? null, wikiId, path);
}

function listMatching(
  store: Map<string, Row>,
  f: Record<string, string>,
  likePrefix: string | undefined,
): { path: string }[] {
  const out: { path: string }[] = [];
  for (const row of store.values()) {
    if (f.wiki_id !== undefined && row.wiki_id !== f.wiki_id) continue;
    if (f.__user_id_is_null) {
      if (row.user_id !== null) continue;
    } else if (f.user_id !== undefined) {
      if (row.user_id !== f.user_id) continue;
    }
    if (likePrefix) {
      const p = likePrefix.replace(/%/g, "");
      if (!row.path.startsWith(p)) continue;
    }
    out.push({ path: row.path });
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

/** Minimal PostgREST-style fluent mock (single shared state per query). */
function mockClient() {
  let filters: Record<string, string> = {};
  let likePrefix: string | undefined;
  let mode: "content" | "count" | "paths" = "content";

  const chain = {
    eq(col: string, val: string) {
      filters[col] = val;
      if (col === "user_id") delete filters.__user_id_is_null;
      return chain;
    },
    is(col: string, val: null) {
      if (col === "user_id" && val === null) {
        filters.__user_id_is_null = "1";
        delete filters.user_id;
      }
      return chain;
    },
    order(_col?: string) {
      return chain;
    },
    like(_col: string, pattern: string) {
      likePrefix = pattern;
      return chain;
    },
    async maybeSingle() {
      const key = keyFromFilters(filters);
      const row = store.get(key);
      return { data: row ? { content: row.content } : null, error: null };
    },
    then(onFulfilled: (v: unknown) => unknown) {
      if (mode === "count") {
        const key = keyFromFilters(filters);
        const exists = store.has(key);
        return Promise.resolve({ count: exists ? 1 : 0, error: null }).then(onFulfilled);
      }
      if (mode === "paths") {
        const data = listMatching(store, filters, likePrefix).filter((r) =>
          r.path.endsWith(".md"),
        );
        return Promise.resolve({ data, error: null }).then(onFulfilled);
      }
      return Promise.resolve({ data: null, error: null }).then(onFulfilled);
    },
  };

  return {
    from(_table: string) {
      return {
        select(fields: string, opts?: { count?: string; head?: boolean }) {
          filters = {};
          likePrefix = undefined;
          if (opts?.count === "exact" && opts?.head) {
            mode = "count";
          } else if (fields === "path") {
            mode = "paths";
          } else {
            mode = "content";
          }
          return chain;
        },
        upsert(row: Record<string, unknown>, _opts?: { onConflict?: string }) {
          const rawUid = row.user_id;
          const uid =
            rawUid === undefined || rawUid === null ? null : String(rawUid);
          const wikiId = String(row.wiki_id);
          const path = String(row.path);
          const key = rowKey(uid, wikiId, path);
          store.set(key, {
            user_id: uid,
            wiki_id: wikiId,
            path,
            content: String(row.content),
          });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function fakeJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `${header}.${payload}.x`;
}

let provider: SupabaseProvider;

beforeEach(() => {
  store = new Map();
  provider = new SupabaseProvider(mockClient(), "test-wiki", USER_A);
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

  it("isolates pages by wiki_id (multi-profile)", async () => {
    const dad = new SupabaseProvider(mockClient(), "family:dad", USER_A);
    const mom = new SupabaseProvider(mockClient(), "family:mom", USER_A);
    await dad.writePage("wiki/shared-path.md", "from dad");
    await mom.writePage("wiki/shared-path.md", "from mom");
    expect(await dad.readPage("wiki/shared-path.md")).toBe("from dad");
    expect(await mom.readPage("wiki/shared-path.md")).toBe("from mom");
  });

  it("isolates pages by user_id (RLS-style)", async () => {
    const alice = new SupabaseProvider(mockClient(), "shared-wiki", USER_A);
    const bob = new SupabaseProvider(mockClient(), "shared-wiki", USER_B);
    await alice.writePage("wiki/note.md", "alice");
    await bob.writePage("wiki/note.md", "bob");
    expect(await alice.readPage("wiki/note.md")).toBe("alice");
    expect(await bob.readPage("wiki/note.md")).toBe("bob");
  });

  it("unscoped mode reads and writes only user_id null partition", async () => {
    const globalProv = new SupabaseProvider(mockClient(), "solo-wiki");
    const scoped = new SupabaseProvider(mockClient(), "solo-wiki", USER_A);
    await globalProv.writePage("wiki/a.md", "global");
    await scoped.writePage("wiki/a.md", "mine");
    expect(await globalProv.readPage("wiki/a.md")).toBe("global");
    expect(await scoped.readPage("wiki/a.md")).toBe("mine");
  });

  it("rejects token without parsable sub", async () => {
    expect(
      SupabaseProvider.create("http://local.test", "k", "w", { accessToken: "not-a-jwt" }),
    ).rejects.toThrow(/Invalid Supabase access token/);
  });
});
