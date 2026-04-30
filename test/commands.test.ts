import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

let testDir: string;
let wikiDir: string;
let configDir: string;
const origConfigDir = process.env.LLMWIKI_CONFIG_DIR;

async function runWiki(args: string[], input?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(
    ["bun", "run", "src/index.ts", ...args],
    {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
      stdin: input ? new Blob([input]) : undefined,
      env: {
        ...process.env,
        LLMWIKI_CONFIG_DIR: configDir,
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@test.com",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@test.com",
      },
    },
  );
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { stdout, stderr, exitCode };
}

async function initWiki(name = "testwiki", backend = "filesystem"): Promise<void> {
  const result = await runWiki(["init", wikiDir, "--name", name, "--domain", "test", "--backend", backend]);
  if (result.exitCode !== 0) {
    throw new Error(`Init failed: ${result.stderr}`);
  }
}

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-cmd-"));
  wikiDir = join(testDir, "wiki");
  configDir = await mkdtemp(join(tmpdir(), "llmwiki-cmd-cfg-"));
  process.env.LLMWIKI_CONFIG_DIR = configDir;
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  await rm(configDir, { recursive: true, force: true });
  if (origConfigDir) {
    process.env.LLMWIKI_CONFIG_DIR = origConfigDir;
  } else {
    delete process.env.LLMWIKI_CONFIG_DIR;
  }
});

// --- write + read ---

describe("write and read commands", () => {
  it("writes content via stdin and reads it back", async () => {
    await initWiki();
    const writeResult = await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/attention.md"],
      "# Attention\n\nA mechanism in transformers.",
    );
    expect(writeResult.exitCode).toBe(0);

    const readResult = await runWiki(["-w", "testwiki", "read", "wiki/concepts/attention.md"]);
    expect(readResult.exitCode).toBe(0);
    expect(readResult.stdout).toContain("# Attention");
    expect(readResult.stdout).toContain("mechanism in transformers");
  });

  it("read returns error for missing page", async () => {
    await initWiki();
    const result = await runWiki(["-w", "testwiki", "read", "nonexistent.md"]);
    expect(result.exitCode).toBe(1);
  });
});

// --- append ---

describe("append command", () => {
  it("appends content to existing page", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/test.md"],
      "Line 1",
    );
    await runWiki(
      ["-w", "testwiki", "append", "wiki/concepts/test.md"],
      "Line 2",
    );
    const result = await runWiki(["-w", "testwiki", "read", "wiki/concepts/test.md"]);
    expect(result.stdout).toContain("Line 1");
    expect(result.stdout).toContain("Line 2");
  });
});

// --- list ---

describe("list command", () => {
  it("lists pages in wiki", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/a.md"],
      "content a",
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/sources/b.md"],
      "content b",
    );
    const result = await runWiki(["-w", "testwiki", "list"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("wiki/concepts/a.md");
    expect(result.stdout).toContain("wiki/sources/b.md");
  });

  it("lists pages in json format", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/x.md"],
      "content",
    );
    const result = await runWiki(["-w", "testwiki", "list", "--json"]);
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toContain("wiki/concepts/x.md");
  });
});

// --- search ---

describe("search command", () => {
  it("finds pages matching query", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/ml.md"],
      "Machine learning is a field of AI.",
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/cooking.md"],
      "Cooking is the art of preparing food.",
    );
    const result = await runWiki(["-w", "testwiki", "search", "machine learning"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ml.md");
  });

  it("returns json format", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/test.md"],
      "Searchable content here.",
    );
    const result = await runWiki(["-w", "testwiki", "search", "searchable", "--json"]);
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].path).toContain("test.md");
  });
});

// --- index ---

describe("index command", () => {
  it("adds and removes entries from index", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/attention.md"],
      "Attention mechanism",
    );
    const addResult = await runWiki([
      "-w", "testwiki", "index", "add", "wiki/concepts/attention.md", "Attention mechanism",
    ]);
    expect(addResult.exitCode).toBe(0);

    // Verify entry exists in index
    const indexContent = await readFile(join(wikiDir, "wiki/index.md"), "utf-8");
    expect(indexContent).toContain("[[wiki/concepts/attention.md]]");

    const removeResult = await runWiki([
      "-w", "testwiki", "index", "remove", "wiki/concepts/attention.md",
    ]);
    expect(removeResult.exitCode).toBe(0);

    const afterRemove = await readFile(join(wikiDir, "wiki/index.md"), "utf-8");
    expect(afterRemove).not.toContain("[[wiki/concepts/attention.md]]");
  });
});

// --- log ---

describe("log command", () => {
  it("appends and shows log entries", async () => {
    await initWiki();
    const appendResult = await runWiki([
      "-w", "testwiki", "log", "append", "ingest", "Added new paper",
    ]);
    expect(appendResult.exitCode).toBe(0);

    const showResult = await runWiki(["-w", "testwiki", "log", "show"]);
    expect(showResult.exitCode).toBe(0);
    expect(showResult.stdout).toContain("Added new paper");
  });

  it("filters log by type", async () => {
    await initWiki();
    await runWiki(["-w", "testwiki", "log", "append", "ingest", "Paper A"]);
    await runWiki(["-w", "testwiki", "log", "append", "query", "Question B"]);
    await runWiki(["-w", "testwiki", "log", "append", "ingest", "Paper C"]);

    const result = await runWiki(["-w", "testwiki", "log", "show", "--type", "ingest"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Paper A");
    expect(result.stdout).toContain("Paper C");
    expect(result.stdout).not.toContain("Question B");
  });
});

// --- lint ---

describe("lint command", () => {
  it("reports issues on freshly init'd wiki", async () => {
    await initWiki();
    const result = await runWiki(["-w", "testwiki", "lint"]);
    expect(result.exitCode).toBe(0);
    // Fresh wiki has SCHEMA.md with example wikilinks and missing frontmatter
    expect(result.stdout).toContain("issues found");
  });

  it("detects broken wikilinks", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/broken.md"],
      "---\ntitle: Broken\n---\n\nLinks to [[nonexistent]].",
    );
    const result = await runWiki(["-w", "testwiki", "lint"]);
    expect(result.stdout).toContain("Broken links");
    expect(result.stdout).toContain("nonexistent");
  });

  it("detects missing frontmatter", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/nofm.md"],
      "No frontmatter here.",
    );
    const result = await runWiki(["-w", "testwiki", "lint"]);
    expect(result.stdout).toContain("Missing frontmatter");
  });

  it("outputs json format", async () => {
    await initWiki();
    const result = await runWiki(["-w", "testwiki", "lint", "--json"]);
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data).toHaveProperty("issues");
    expect(data).toHaveProperty("pagesChecked");
  });
});

// --- status ---

describe("status command", () => {
  it("shows wiki overview", async () => {
    await initWiki();
    const result = await runWiki(["-w", "testwiki", "status"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("testwiki");
    expect(result.stdout).toContain("Pages:");
    expect(result.stdout).toContain("Pages:");
  });

  it("outputs json format", async () => {
    await initWiki();
    const result = await runWiki(["-w", "testwiki", "status", "--json"]);
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.name).toBe("testwiki");
    expect(data.domain).toBe("test");
    expect(data.pages).toHaveProperty("total");
    expect(data.links).toHaveProperty("total");
    expect(data.git).toHaveProperty("commits");
  });
});

// --- links + backlinks + orphans ---

describe("links command", () => {
  it("shows outbound links for a page", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/a.md"],
      "Links to [[b]] and [[c]].",
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/b.md"],
      "Target B.",
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/c.md"],
      "Target C.",
    );
    const result = await runWiki(["-w", "testwiki", "links", "wiki/concepts/a.md"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("b");
    expect(result.stdout).toContain("c");
  });
});

describe("backlinks command", () => {
  it("shows pages linking to a target", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/linker.md"],
      "Links to [[target]].",
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/target.md"],
      "Target page.",
    );
    const result = await runWiki(["-w", "testwiki", "backlinks", "wiki/concepts/target.md"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("linker");
  });
});

describe("orphans command", () => {
  it("lists pages with no inbound links", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/lonely.md"],
      "No one links here.",
    );
    const result = await runWiki(["-w", "testwiki", "orphans"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("lonely");
  });
});

describe("profile command", () => {
  it("profile show for filesystem wiki prints effective root", async () => {
    await initWiki();
    const result = await runWiki(["-w", "testwiki", "profile", "show"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Registry wiki id: testwiki");
    expect(result.stdout).toContain("Effective storage root:");
    expect(result.stdout).toContain("Source: default");
  });

  it("profile use saves slug and profile show updates effective root", async () => {
    await initWiki();
    const use = await runWiki(["-w", "testwiki", "profile", "use", "dad"]);
    expect(use.exitCode).toBe(0);
    const show = await runWiki(["-w", "testwiki", "profile", "show"]);
    expect(show.exitCode).toBe(0);
    expect(show.stdout).toContain("profiles");
    expect(show.stdout).toContain("dad");
    expect(show.stdout).toContain("Saved profile in registry: dad");
  });

  it("profile clear removes registry slug", async () => {
    await initWiki();
    const use = await runWiki(["-w", "testwiki", "profile", "use", "son"]);
    expect(use.exitCode).toBe(0);
    const clear = await runWiki(["-w", "testwiki", "profile", "clear"]);
    expect(clear.exitCode).toBe(0);
    const show = await runWiki(["-w", "testwiki", "profile", "show"]);
    expect(show.exitCode).toBe(0);
    expect(show.stdout).not.toContain("Saved profile in registry:");
    expect(show.stdout).toContain("Source: default");
    expect(show.stdout).not.toMatch(/profiles[^\n]*son/);
  });
});

// --- error cases ---

describe("error handling", () => {
  it("fails gracefully when no wiki found", async () => {
    const result = await runWiki(["read", "something.md"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("No wiki found");
  });

  it("fails when --wiki points to unknown id", async () => {
    const result = await runWiki(["-w", "nonexistent", "read", "something.md"]);
    expect(result.exitCode).toBe(1);
  });
});
