import { describe, it, expect, mock } from "bun:test";

describe("probeWikiPagesTable", () => {
  it("returns ok when select, upsert, and delete succeed", async () => {
    mock.module("@supabase/supabase-js", () => ({
      createClient: () => ({
        from() {
          return {
            select() {
              return {
                limit() {
                  return Promise.resolve({ error: null });
                },
              };
            },
            upsert() {
              return Promise.resolve({ error: null });
            },
            delete() {
              const del: any = {
                eq() {
                  return del;
                },
                is() {
                  return Promise.resolve({ error: null });
                },
              };
              return del;
            },
          };
        },
      }),
    }));

    const { probeWikiPagesTable } = await import(
      "../src/lib/supabase-wiki-pages-probe.ts"
    );
    const r = await probeWikiPagesTable("https://example.supabase.co", "test-key", {});
    expect(r.ok).toBe(true);
    mock.restore();
  });

  it("returns failure when select reports an error", async () => {
    mock.module("@supabase/supabase-js", () => ({
      createClient: () => ({
        from() {
          return {
            select() {
              return {
                limit() {
                  return Promise.resolve({ error: { message: "relation missing" } });
                },
              };
            },
          };
        },
      }),
    }));

    const { probeWikiPagesTable } = await import(
      "../src/lib/supabase-wiki-pages-probe.ts"
    );
    const r = await probeWikiPagesTable("https://example.supabase.co", "k", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("relation missing");
    mock.restore();
  });
});
