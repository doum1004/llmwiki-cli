import { describe, it, expect, afterEach } from "bun:test";
import { resolvedGitToken } from "../src/lib/git-credentials.ts";
import type { WikiConfig } from "../src/types.ts";

describe("resolvedGitToken", () => {
  afterEach(() => {
    delete process.env.LLMWIKI_GIT_TOKEN;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GIT_TOKEN;
  });

  it("prefers LLMWIKI_GIT_TOKEN over YAML", () => {
    process.env.LLMWIKI_GIT_TOKEN = "env-pat";
    const config: WikiConfig = {
      name: "w",
      domain: "g",
      created: "x",
      backend: "git",
      git: { repo: "o/r", token: "yaml-pat" },
      paths: { raw: "r", wiki: "w", schema: "S" },
    };
    expect(resolvedGitToken(config)).toBe("env-pat");
  });

  it("falls back to git.token in config", () => {
    const config: WikiConfig = {
      name: "w",
      domain: "g",
      created: "x",
      backend: "git",
      git: { repo: "o/r", token: "yaml-only" },
      paths: { raw: "r", wiki: "w", schema: "S" },
    };
    expect(resolvedGitToken(config)).toBe("yaml-only");
  });
});
