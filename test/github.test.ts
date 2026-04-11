import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import * as yaml from "js-yaml";

let configDir: string;
const origConfigDir = process.env.LLMWIKI_CONFIG_DIR;
const origFetch = globalThis.fetch;

beforeEach(async () => {
  configDir = await mkdtemp(join(tmpdir(), "llmwiki-gh-"));
  process.env.LLMWIKI_CONFIG_DIR = configDir;

  // Save a fake auth token
  await mkdir(configDir, { recursive: true });
  const auth = { token: "ghp_fake123", username: "testuser", created: "2026-01-01T00:00:00.000Z" };
  await writeFile(join(configDir, "auth.yaml"), yaml.dump(auth), "utf-8");
});

afterEach(async () => {
  globalThis.fetch = origFetch;
  await rm(configDir, { recursive: true, force: true });
  if (origConfigDir) {
    process.env.LLMWIKI_CONFIG_DIR = origConfigDir;
  } else {
    delete process.env.LLMWIKI_CONFIG_DIR;
  }
});

function mockFetch(handler: (url: string, opts?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = handler as typeof fetch;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("listRepos", () => {
  it("returns repos from API", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    const fakeRepos = [
      { name: "wiki-science", full_name: "user/wiki-science", private: true, html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: null },
      { name: "wiki-code", full_name: "user/wiki-code", private: true, html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: null },
    ];
    mockFetch(() => jsonResponse(fakeRepos));

    const repos = await listRepos();
    expect(repos).toHaveLength(2);
    expect(repos[0]!.name).toBe("wiki-science");
  });

  it("filters repos by name", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    const fakeRepos = [
      { name: "wiki-science", full_name: "user/wiki-science", private: true, html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: null },
      { name: "other-project", full_name: "user/other-project", private: false, html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: null },
    ];
    mockFetch(() => jsonResponse(fakeRepos));

    const repos = await listRepos({ filter: "wiki" });
    expect(repos).toHaveLength(1);
    expect(repos[0]!.name).toBe("wiki-science");
  });

  it("filter is case insensitive", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    const fakeRepos = [
      { name: "MyWiki", full_name: "user/MyWiki", private: true, html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: null },
    ];
    mockFetch(() => jsonResponse(fakeRepos));

    const repos = await listRepos({ filter: "mywiki" });
    expect(repos).toHaveLength(1);
  });

  it("throws on API error", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    mockFetch(() => new Response("", { status: 500, statusText: "Internal Server Error" }));

    try {
      await listRepos();
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as Error).message).toContain("GitHub API error");
    }
  });

  it("handles empty response", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    mockFetch(() => jsonResponse([]));

    const repos = await listRepos();
    expect(repos).toHaveLength(0);
  });

  it("uses perPage=20 by default (not all)", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    let capturedUrl = "";
    mockFetch((url: string) => {
      capturedUrl = url;
      return jsonResponse([]);
    });

    await listRepos();
    expect(capturedUrl).toContain("per_page=20");
  });

  it("uses perPage=100 when all=true", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    let capturedUrl = "";
    mockFetch((url: string) => {
      capturedUrl = url;
      return jsonResponse([]);
    });

    await listRepos({ all: true });
    expect(capturedUrl).toContain("per_page=100");
  });

  it("stops pagination when page returns fewer than perPage", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    let callCount = 0;
    mockFetch(() => {
      callCount++;
      const repos = Array.from({ length: 5 }, (_, i) => ({
        name: `repo-${i}`, full_name: `user/repo-${i}`, private: true,
        html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: null,
      }));
      return jsonResponse(repos);
    });

    const repos = await listRepos({ all: true });
    expect(repos).toHaveLength(5);
    expect(callCount).toBe(1); // Should not paginate since 5 < 100
  });
});

describe("getRepo", () => {
  it("returns repo data on success", async () => {
    const { getRepo } = await import("../src/lib/github.ts");
    const fakeRepo = {
      name: "wiki-test", full_name: "user/wiki-test", private: true,
      html_url: "https://github.com/user/wiki-test", clone_url: "", ssh_url: "",
      pushed_at: "2026-01-01", description: "test",
    };
    mockFetch(() => jsonResponse(fakeRepo));

    const repo = await getRepo("user", "wiki-test");
    expect(repo).not.toBeNull();
    expect(repo!.name).toBe("wiki-test");
  });

  it("returns null on 404", async () => {
    const { getRepo } = await import("../src/lib/github.ts");
    mockFetch(() => new Response("", { status: 404 }));

    const repo = await getRepo("user", "nonexistent");
    expect(repo).toBeNull();
  });
});

describe("createRepo", () => {
  it("creates repo successfully", async () => {
    const { createRepo } = await import("../src/lib/github.ts");
    const fakeRepo = {
      name: "wiki-new", full_name: "user/wiki-new", private: true,
      html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: "LLM Wiki",
    };
    mockFetch(() => jsonResponse(fakeRepo, 201));

    const repo = await createRepo("wiki-new");
    expect(repo.name).toBe("wiki-new");
  });

  it("throws specific error for duplicate name (422)", async () => {
    const { createRepo } = await import("../src/lib/github.ts");
    mockFetch(() => jsonResponse(
      { message: "Repository creation failed. name already exists on this account" },
      422,
    ));

    try {
      await createRepo("existing-repo");
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as Error).message).toContain("already exists");
    }
  });

  it("throws auth error for 401", async () => {
    const { createRepo } = await import("../src/lib/github.ts");
    mockFetch(() => jsonResponse({ message: "Bad credentials" }, 401));

    try {
      await createRepo("new-repo");
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as Error).message).toContain("Authentication failed");
    }
  });

  it("throws permission error for 403", async () => {
    const { createRepo } = await import("../src/lib/github.ts");
    mockFetch(() => jsonResponse({ message: "Forbidden" }, 403));

    try {
      await createRepo("new-repo");
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as Error).message).toContain("Permission denied");
    }
  });

  it("uses default options (private, LLM Wiki description)", async () => {
    const { createRepo } = await import("../src/lib/github.ts");
    let capturedBody: string = "";
    mockFetch(async (_url, opts) => {
      capturedBody = opts?.body as string ?? "";
      return jsonResponse({
        name: "wiki-new", full_name: "user/wiki-new", private: true,
        html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: "LLM Wiki",
      }, 201);
    });

    await createRepo("wiki-new");
    const parsed = JSON.parse(capturedBody);
    expect(parsed.private).toBe(true);
    expect(parsed.description).toBe("LLM Wiki");
    expect(parsed.auto_init).toBe(false);
  });

  it("respects custom options", async () => {
    const { createRepo } = await import("../src/lib/github.ts");
    let capturedBody: string = "";
    mockFetch(async (_url, opts) => {
      capturedBody = opts?.body as string ?? "";
      return jsonResponse({
        name: "wiki-pub", full_name: "user/wiki-pub", private: false,
        html_url: "", clone_url: "", ssh_url: "", pushed_at: "", description: "My wiki",
      }, 201);
    });

    await createRepo("wiki-pub", { private: false, description: "My wiki" });
    const parsed = JSON.parse(capturedBody);
    expect(parsed.private).toBe(false);
    expect(parsed.description).toBe("My wiki");
  });

  it("includes error details in generic failures", async () => {
    const { createRepo } = await import("../src/lib/github.ts");
    mockFetch(() => jsonResponse(
      { message: "Validation failed", errors: [{ message: "name is invalid" }] },
      422,
    ));

    try {
      await createRepo("bad--name");
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect((err as Error).message).toContain("name is invalid");
    }
  });
});

describe("githubFetch auth headers", () => {
  it("includes Authorization header with token", async () => {
    const { listRepos } = await import("../src/lib/github.ts");
    let capturedHeaders: Record<string, string> = {};
    mockFetch((_url, opts) => {
      capturedHeaders = Object.fromEntries(
        Object.entries(opts?.headers ?? {}).map(([k, v]) => [k, String(v)])
      );
      return jsonResponse([]);
    });

    await listRepos();
    expect(capturedHeaders["Authorization"]).toBe("Bearer ghp_fake123");
    expect(capturedHeaders["Accept"]).toContain("github");
  });
});
