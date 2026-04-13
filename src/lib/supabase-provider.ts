import type { StorageProvider } from "../types.ts";
import { parseJwtSub } from "./supabase-jwt.ts";

const TABLE = "wiki_pages";

/** Matches DB unique constraint `unique nulls not distinct (user_id, wiki_id, path)`. */
const UPSERT_ON_CONFLICT = "user_id,wiki_id,path";

export class SupabaseProvider implements StorageProvider {
  private client: any;
  private wikiId: string;
  /**
   * JWT `sub` when using a user access token: read/write/list only that user's rows.
   * Omitted: only `user_id` IS NULL rows (single-tenant / service key).
   */
  private scopedUserId: string | undefined;

  constructor(client: any, wikiId: string, scopedUserId?: string) {
    this.client = client;
    this.wikiId = wikiId;
    this.scopedUserId = scopedUserId;
  }

  static async create(
    url: string,
    key: string,
    wikiId: string,
    options?: { accessToken?: string },
  ): Promise<SupabaseProvider> {
    let createClient: any;
    try {
      const mod = await import("@supabase/supabase-js");
      createClient = mod.createClient;
    } catch {
      throw new Error(
        'Supabase backend requires @supabase/supabase-js. Install it:\n  npm install @supabase/supabase-js',
      );
    }

    const accessToken = options?.accessToken?.trim();
    let scopedUserId: string | undefined;
    if (accessToken) {
      scopedUserId = parseJwtSub(accessToken);
      if (!scopedUserId) {
        throw new Error(
          "Invalid Supabase access token: could not read JWT sub claim (expected a Supabase Auth user JWT).",
        );
      }
    }

    const client = createClient(url, key, {
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    });
    return new SupabaseProvider(client, wikiId, scopedUserId);
  }

  async readPage(relativePath: string): Promise<string | null> {
    let q = this.client
      .from(TABLE)
      .select("content")
      .eq("wiki_id", this.wikiId)
      .eq("path", relativePath);
    if (this.scopedUserId) q = q.eq("user_id", this.scopedUserId);
    else q = q.is("user_id", null);
    const { data, error } = await q.maybeSingle();

    if (error) throw new Error(`Supabase read error: ${error.message}`);
    return data?.content ?? null;
  }

  async writePage(relativePath: string, content: string): Promise<void> {
    const row: Record<string, unknown> = {
      wiki_id: this.wikiId,
      path: relativePath,
      content,
      updated_at: new Date().toISOString(),
    };
    row.user_id = this.scopedUserId ?? null;

    const { error } = await this.client.from(TABLE).upsert(row, {
      onConflict: UPSERT_ON_CONFLICT,
    });

    if (error) throw new Error(`Supabase write error: ${error.message}`);
  }

  async appendPage(
    relativePath: string,
    content: string,
  ): Promise<boolean> {
    const existing = await this.readPage(relativePath);
    if (existing === null) return false;
    const separator = existing.endsWith("\n") ? "" : "\n";
    await this.writePage(relativePath, existing + separator + content);
    return true;
  }

  async pageExists(relativePath: string): Promise<boolean> {
    let q = this.client
      .from(TABLE)
      .select("path", { count: "exact", head: true })
      .eq("wiki_id", this.wikiId)
      .eq("path", relativePath);
    if (this.scopedUserId) q = q.eq("user_id", this.scopedUserId);
    else q = q.is("user_id", null);
    const { count, error } = await q;

    if (error) throw new Error(`Supabase exists error: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async listPages(dir?: string): Promise<string[]> {
    let query = this.client.from(TABLE).select("path").eq("wiki_id", this.wikiId);
    if (this.scopedUserId) query = query.eq("user_id", this.scopedUserId);
    else query = query.is("user_id", null);
    query = query.order("path");

    if (dir) {
      const prefix = dir.endsWith("/") ? dir : dir + "/";
      query = query.like("path", `${prefix}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase list error: ${error.message}`);
    return (data ?? [])
      .map((row: { path: string }) => row.path)
      .filter((p: string) => p.endsWith(".md"));
  }
}
