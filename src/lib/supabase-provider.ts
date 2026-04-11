import type { StorageProvider } from "../types.ts";

const TABLE = "wiki_pages";

export class SupabaseProvider implements StorageProvider {
  private client: any;
  private wikiId: string;

  constructor(client: any, wikiId: string) {
    this.client = client;
    this.wikiId = wikiId;
  }

  static async create(
    url: string,
    key: string,
    wikiId: string,
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
    const client = createClient(url, key);
    return new SupabaseProvider(client, wikiId);
  }

  async readPage(relativePath: string): Promise<string | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("content")
      .eq("wiki_id", this.wikiId)
      .eq("path", relativePath)
      .maybeSingle();

    if (error) throw new Error(`Supabase read error: ${error.message}`);
    return data?.content ?? null;
  }

  async writePage(relativePath: string, content: string): Promise<void> {
    const { error } = await this.client.from(TABLE).upsert(
      {
        wiki_id: this.wikiId,
        path: relativePath,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wiki_id,path" },
    );

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
    const { count, error } = await this.client
      .from(TABLE)
      .select("path", { count: "exact", head: true })
      .eq("wiki_id", this.wikiId)
      .eq("path", relativePath);

    if (error) throw new Error(`Supabase exists error: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async listPages(dir?: string): Promise<string[]> {
    let query = this.client
      .from(TABLE)
      .select("path")
      .eq("wiki_id", this.wikiId)
      .order("path");

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
