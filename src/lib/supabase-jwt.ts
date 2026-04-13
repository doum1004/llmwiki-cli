/**
 * Read JWT `sub` (Supabase Auth user id) without verifying the signature.
 * Used only to attach the same id to queries/upserts; authorization is enforced by RLS in Postgres.
 */
export function parseJwtSub(token: string): string | undefined {
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3) return undefined;
  const payload = parts[1];
  if (!payload) return undefined;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
    };
    return typeof json.sub === "string" ? json.sub : undefined;
  } catch {
    return undefined;
  }
}
