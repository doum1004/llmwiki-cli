interface GitHubRepo {
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
}

export async function createRepo(
  token: string,
  name: string,
): Promise<GitHubRepo> {
  const res = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      private: true,
      description: "LLM Wiki",
      auto_init: false,
    }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { message: string; errors?: { message: string }[] };
    if (res.status === 422 && err.message?.includes("name already exists")) {
      throw new Error(`Repository "${name}" already exists.`);
    }
    if (res.status === 401) {
      throw new Error("Authentication failed. Check your --git-token.");
    }
    if (res.status === 403) {
      throw new Error("Permission denied. Your token may lack the 'repo' scope.");
    }
    const detail = err.errors?.map((e) => e.message).join(", ") ?? err.message;
    throw new Error(`Failed to create repo (${res.status}): ${detail}`);
  }

  return (await res.json()) as GitHubRepo;
}

export async function getUsername(token: string): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error("Invalid git token. GitHub API returned " + res.status);
  const data = (await res.json()) as { login: string };
  return data.login;
}
