import { getToken } from "./auth.ts";

interface GitHubRepo {
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  pushed_at: string;
  description: string | null;
}

async function githubFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = await getToken();
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return res;
}

export async function listRepos(options?: {
  all?: boolean;
  filter?: string;
}): Promise<GitHubRepo[]> {
  const perPage = options?.all ? 100 : 20;
  let repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await githubFetch(
      `/user/repos?per_page=${perPage}&sort=pushed&page=${page}`,
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as GitHubRepo[];
    if (data.length === 0) break;
    repos = repos.concat(data);
    if (!options?.all || data.length < perPage) break;
    page++;
  }

  if (options?.filter) {
    const f = options.filter.toLowerCase();
    repos = repos.filter((r) => r.name.toLowerCase().includes(f));
  }

  return repos;
}

export async function getRepo(owner: string, name: string): Promise<GitHubRepo | null> {
  const res = await githubFetch(`/repos/${owner}/${name}`);
  if (!res.ok) return null;
  return (await res.json()) as GitHubRepo;
}

export async function createRepo(
  name: string,
  options?: { private?: boolean; description?: string },
): Promise<GitHubRepo> {
  const res = await githubFetch("/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name,
      private: options?.private ?? true,
      description: options?.description ?? "LLM Wiki",
      auto_init: false,
    }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { message: string; errors?: { message: string }[] };
    if (res.status === 422 && err.message?.includes("name already exists")) {
      throw new Error(
        `Repository "${name}" already exists. Delete it first with:\n  gh repo delete ${name} --yes\nOr use a different name.`,
      );
    }
    if (res.status === 401) {
      throw new Error('Authentication failed. Run "wiki auth login" to re-authenticate.');
    }
    if (res.status === 403) {
      throw new Error("Permission denied. Your token may lack the 'repo' scope.");
    }
    const detail = err.errors?.map((e) => e.message).join(", ") ?? err.message;
    throw new Error(`Failed to create repo (${res.status}): ${detail}`);
  }

  return (await res.json()) as GitHubRepo;
}
