import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, writeFile } from "fs/promises";
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

async function initWiki(name = "testwiki"): Promise<void> {
  const result = await runWiki(["init", wikiDir, "--name", name, "--domain", "test"]);
  if (result.exitCode !== 0) {
    throw new Error(`Init failed: ${result.stderr}`);
  }
}

function jp(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
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
  it("writes JSON via stdin and reads markdown back", async () => {
    await initWiki();
    const payload = jp({
      title: "Attention",
      content: "# Attention\n\nA mechanism in transformers.",
    });
    const writeResult = await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/attention.md"],
      payload,
    );
    expect(writeResult.exitCode).toBe(0);
    expect(writeResult.stdout).toContain("wrote wiki/concepts/attention.md");
    expect(writeResult.stdout).toContain("updated index:");

    const readResult = await runWiki(["-w", "testwiki", "read", "wiki/concepts/attention.md"]);
    expect(readResult.exitCode).toBe(0);
    expect(readResult.stdout).toContain("title: Attention");
    expect(readResult.stdout).toContain("# Attention");
    expect(readResult.stdout).toContain("mechanism in transformers");
  });

  it("read returns error for missing page", async () => {
    await initWiki();
    const result = await runWiki(["-w", "testwiki", "read", "nonexistent.md"]);
    expect(result.exitCode).toBe(1);
  });

  it("write rejects invalid JSON", async () => {
    await initWiki();
    const result = await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/x.md"],
      "not json",
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("not valid JSON");
  });

  it("write rejects unknown JSON keys", async () => {
    await initWiki();
    const result = await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/x.md"],
      jp({ title: "T", content: "C", extra: 1 }),
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("unknown property");
  });

  it("write rejects invalid source URL", async () => {
    await initWiki();
    const result = await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/x.md"],
      jp({ title: "T", content: "C", source: "not-a-url" }),
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("source");
  });

  it("write upserts index on second write for same path", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/a.md"],
      jp({ title: "First", content: "# First\n" }),
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/a.md"],
      jp({ title: "Second", content: "# Second\n" }),
    );
    const indexContent = await readFile(join(wikiDir, "wiki/index.md"), "utf-8");
    expect(indexContent).toContain("[[wiki/concepts/a.md]]");
    expect(indexContent).toContain("— Second");
    expect(indexContent.match(/\[\[wiki\/concepts\/a\.md\]\]/g)?.length).toBe(1);
  });

  it("write preserves created on edit when frontmatter had created", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/d.md"],
      jp({
        title: "D",
        content: "# D\n",
        created: "2020-01-15",
        updated: "2020-02-01",
      }),
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/d.md"],
      jp({
        title: "D2",
        content: "# D2\n",
        created: "2099-01-01",
        updated: "2099-06-01",
      }),
    );
    const readResult = await runWiki(["-w", "testwiki", "read", "wiki/concepts/d.md"]);
    expect(readResult.stdout).toContain("2020-01-15");
    expect(readResult.stdout).toContain("2099-06-01");
  });
});

describe("delete command", () => {
  it("deletes page and removes index line", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/z.md"],
      jp({ title: "Z", content: "# Z\n" }),
    );
    let indexContent = await readFile(join(wikiDir, "wiki/index.md"), "utf-8");
    expect(indexContent).toContain("[[wiki/concepts/z.md]]");

    const del = await runWiki(["-w", "testwiki", "delete", "wiki/concepts/z.md"]);
    expect(del.exitCode).toBe(0);

    const readMissing = await runWiki(["-w", "testwiki", "read", "wiki/concepts/z.md"]);
    expect(readMissing.exitCode).toBe(1);

    indexContent = await readFile(join(wikiDir, "wiki/index.md"), "utf-8");
    expect(indexContent).not.toContain("[[wiki/concepts/z.md]]");
  });

  it("delete fails for missing page", async () => {
    await initWiki();
    const del = await runWiki(["-w", "testwiki", "delete", "wiki/concepts/nope.md"]);
    expect(del.exitCode).toBe(1);
    expect(del.stderr).toContain("not found");
  });
});

// --- list ---

describe("list command", () => {
  it("lists pages in wiki", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/a.md"],
      jp({ title: "A", content: "content a" }),
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/sources/b.md"],
      jp({ title: "B", content: "content b" }),
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
      jp({ title: "X", content: "content" }),
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
      jp({ title: "ML", content: "Machine learning is a field of AI." }),
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/cooking.md"],
      jp({ title: "Cooking", content: "Cooking is the art of preparing food." }),
    );
    const result = await runWiki(["-w", "testwiki", "search", "machine learning"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ml.md");
  });

  it("returns json format", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/test.md"],
      jp({ title: "Test", content: "Searchable content here." }),
    );
    const result = await runWiki(["-w", "testwiki", "search", "searchable", "--json"]);
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].path).toContain("test.md");
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
      jp({
        title: "Broken",
        content: "Links to [[nonexistent]].",
      }),
    );
    const result = await runWiki(["-w", "testwiki", "lint"]);
    expect(result.stdout).toContain("Broken links");
    expect(result.stdout).toContain("nonexistent");
  });

  it("detects missing frontmatter", async () => {
    await initWiki();
    await writeFile(join(wikiDir, "wiki/concepts/nofm.md"), "No frontmatter here.", "utf-8");
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
    expect(data.path).toBe(wikiDir);
  });
});

// --- links + backlinks + orphans ---

describe("links command", () => {
  it("shows outbound links for a page", async () => {
    await initWiki();
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/a.md"],
      jp({ title: "A", content: "Links to [[b]] and [[c]]." }),
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/b.md"],
      jp({ title: "B", content: "Target B." }),
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/c.md"],
      jp({ title: "C", content: "Target C." }),
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
      jp({ title: "Linker", content: "Links to [[target]]." }),
    );
    await runWiki(
      ["-w", "testwiki", "write", "wiki/concepts/target.md"],
      jp({ title: "Target", content: "Target page." }),
    );
    const result = await runWiki(["-w", "testwiki", "backlinks", "wiki/concepts/target.md"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("linker");
  });
});

describe("orphans command", () => {
  it("lists pages with no inbound links", async () => {
    await initWiki();
    // Under raw/ so wiki/index.md does not wilink here (avoids false inbound from index)
    await runWiki(
      ["-w", "testwiki", "write", "raw/lonely.md"],
      jp({ title: "Lonely", content: "No one links here." }),
    );
    const result = await runWiki(["-w", "testwiki", "orphans"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("raw/lonely.md");
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
