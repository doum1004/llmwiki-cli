import { parseJwtSub } from "./supabase-jwt.ts";

const TABLE = "wiki_pages";
const PROBE_WIKI_ID = "__llmwiki_schema_probe__";
const PROBE_PATH = ".llmwiki-probe.md";

export type WikiPagesProbeResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Verifies `wiki_pages` exists and matches the CLI (columns + upsert on
 * `user_id,wiki_id,path`, nullable `user_id`). Uses a tiny upsert + delete cycle.
 */
export async function probeWikiPagesTable(
  url: string,
  key: string,
  options?: { accessToken?: string },
): Promise<WikiPagesProbeResult> {
  let createClient: any;
  try {
    const mod = await import("@supabase/supabase-js");
    createClient = mod.createClient;
  } catch {
    return {
      ok: false,
      message:
        "Missing @supabase/supabase-js. Install it: npm install @supabase/supabase-js",
    };
  }

  const accessToken = options?.accessToken?.trim();
  const client = createClient(url, key, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });

  const { error: selErr } = await client
    .from(TABLE)
    .select("user_id,wiki_id,path,content")
    .limit(1);
  if (selErr) {
    return { ok: false, message: selErr.message };
  }

  const row = {
    user_id: null as string | null,
    wiki_id: PROBE_WIKI_ID,
    path: PROBE_PATH,
    content: "0",
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await client.from(TABLE).upsert(row, {
    onConflict: "user_id,wiki_id,path",
  });
  if (upErr) {
    return { ok: false, message: upErr.message };
  }

  let del = client.from(TABLE).delete().eq("wiki_id", PROBE_WIKI_ID).eq("path", PROBE_PATH);
  const sub = accessToken ? parseJwtSub(accessToken) : undefined;
  if (sub) del = del.eq("user_id", sub);
  else del = del.is("user_id", null);

  const { error: delErr } = await del;
  if (delErr) {
    return {
      ok: false,
      message: `wiki_pages accepted a probe write but cleanup failed: ${delErr.message}`,
    };
  }

  return { ok: true };
}
