import type { WikiConfig } from "../types.ts";

/**
 * GitHub PAT for remote push / GitHub API. Prefer env vars so `.llmwiki.yaml`
 * can omit the token (avoids secret scanning blocking `git push`).
 */
export function resolvedGitToken(config: WikiConfig): string | undefined {
  const fromEnv =
    process.env.LLMWIKI_GIT_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GIT_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  return config.git?.token?.trim();
}
