import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readdir, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import * as yaml from "js-yaml";
import { loadConfig, saveConfig } from "../src/lib/config.ts";
import {
  loadRegistry,
  addToRegistry,
  removeFromRegistry,
  setDefault,
} from "../src/lib/registry.ts";
import { resolveWiki } from "../src/lib/resolver.ts";
import {
  getDefaultConfig,
  getDefaultSchema,
  getDefaultIndex,
  getVizWorkflow,
  getBuildGraphScript,
  getBuildSiteScript,
  getWikiGitignore,
} from "../src/lib/templates.ts";
import type { WikiConfig, RegistryEntry } from "../src/types.ts";

let testDir: string;
let configDir: string;
const origConfigDir = process.env.LLMWIKI_CONFIG_DIR;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "llmwiki-test-"));
  configDir = await mkdtemp(join(tmpdir(), "llmwiki-config-"));
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

// --- config ---

describe("config", () => {
  it("loadConfig returns null for missing file", async () => {
    const result = await loadConfig(testDir);
    expect(result).toBeNull();
  });

  it("saveConfig writes valid YAML and loadConfig reads it back", async () => {
    const config: WikiConfig = {
      name: "test",
      domain: "testing",
      created: "2026-01-01T00:00:00.000Z",
      paths: { raw: "raw", wiki: "wiki", schema: "SCHEMA.md" },
    };
    await saveConfig(testDir, config);
    const loaded = await loadConfig(testDir);
    expect(loaded).toEqual(config);
  });

  it("config file is valid YAML on disk", async () => {
    const config = getDefaultConfig("mytest", "general");
    await saveConfig(testDir, config);
    const content = await Bun.file(join(testDir, ".llmwiki.yaml")).text();
    const parsed = yaml.load(content) as WikiConfig;
    expect(parsed.name).toBe("mytest");
    expect(parsed.domain).toBe("general");
  });
});

// --- registry ---

describe("registry", () => {
  it("loadRegistry returns empty registry when file missing", async () => {
    const registry = await loadRegistry();
    expect(Object.keys(registry.wikis)).toHaveLength(0);
    expect(registry.default).toBeNull();
  });

  it("addToRegistry adds a new entry", async () => {
    const entry: RegistryEntry = {
      path: "/tmp/wiki1",
      name: "wiki1",
      domain: "general",
      created: "2026-01-01T00:00:00.000Z",
    };
    await addToRegistry("wiki1", entry);
    const registry = await loadRegistry();
    expect(registry.wikis["wiki1"]).toEqual(entry);
  });

  it("addToRegistry sets first wiki as default", async () => {
    const entry: RegistryEntry = {
      path: "/tmp/wiki1",
      name: "wiki1",
      domain: "general",
      created: "2026-01-01T00:00:00.000Z",
    };
    await addToRegistry("wiki1", entry);
    const registry = await loadRegistry();
    expect(registry.default).toBe("wiki1");
  });

  it("addToRegistry updates existing entry with same id", async () => {
    const entry1: RegistryEntry = {
      path: "/tmp/wiki1",
      name: "wiki1",
      domain: "general",
      created: "2026-01-01T00:00:00.000Z",
    };
    await addToRegistry("wiki1", entry1);
    const entry2: RegistryEntry = {
      ...entry1,
      path: "/tmp/wiki1-moved",
    };
    await addToRegistry("wiki1", entry2);
    const registry = await loadRegistry();
    expect(Object.keys(registry.wikis)).toHaveLength(1);
    expect(registry.wikis["wiki1"]?.path).toBe("/tmp/wiki1-moved");
  });

  it("removeFromRegistry removes entry", async () => {
    const entry: RegistryEntry = {
      path: "/tmp/wiki1",
      name: "wiki1",
      domain: "general",
      created: "2026-01-01T00:00:00.000Z",
    };
    await addToRegistry("wiki1", entry);
    const removed = await removeFromRegistry("wiki1");
    expect(removed).toBe(true);
    const registry = await loadRegistry();
    expect(Object.keys(registry.wikis)).toHaveLength(0);
  });

  it("removeFromRegistry returns false for unknown id", async () => {
    const removed = await removeFromRegistry("nonexistent");
    expect(removed).toBe(false);
  });

  it("removeFromRegistry updates default when removing default wiki", async () => {
    const entry1: RegistryEntry = {
      path: "/tmp/wiki1",
      name: "wiki1",
      domain: "general",
      created: "2026-01-01T00:00:00.000Z",
    };
    const entry2: RegistryEntry = {
      path: "/tmp/wiki2",
      name: "wiki2",
      domain: "science",
      created: "2026-01-02T00:00:00.000Z",
    };
    await addToRegistry("wiki1", entry1);
    await addToRegistry("wiki2", entry2);
    await removeFromRegistry("wiki1");
    const registry = await loadRegistry();
    expect(registry.default).toBe("wiki2");
  });

  it("setDefault changes the default wiki", async () => {
    const entry1: RegistryEntry = {
      path: "/tmp/wiki1",
      name: "wiki1",
      domain: "general",
      created: "2026-01-01T00:00:00.000Z",
    };
    const entry2: RegistryEntry = {
      path: "/tmp/wiki2",
      name: "wiki2",
      domain: "science",
      created: "2026-01-02T00:00:00.000Z",
    };
    await addToRegistry("wiki1", entry1);
    await addToRegistry("wiki2", entry2);
    await setDefault("wiki2");
    const registry = await loadRegistry();
    expect(registry.default).toBe("wiki2");
  });

  it("setDefault returns false for unknown id", async () => {
    const result = await setDefault("nonexistent");
    expect(result).toBe(false);
  });

});

// --- resolver ---

describe("resolver", () => {
  it("resolveWiki returns null when no wiki exists", async () => {
    const result = await resolveWiki({});
    expect(result).toBeNull();
  });

  it("resolveWiki finds wiki by --wiki flag", async () => {
    const entry: RegistryEntry = {
      path: testDir,
      name: "flagtest",
      domain: "general",
      created: "2026-01-01T00:00:00.000Z",
    };
    const config = getDefaultConfig("flagtest", "general");
    await saveConfig(testDir, config);
    await addToRegistry("flagtest", entry);

    const result = await resolveWiki({ wiki: "flagtest" });
    expect(result).not.toBeNull();
    expect(result!.id).toBe("flagtest");
    expect(result!.root).toBe(testDir);
  });

  it("resolveWiki falls back to registry default", async () => {
    const wikiDir = await mkdtemp(join(tmpdir(), "llmwiki-resolver-"));
    try {
      const config = getDefaultConfig("defaultwiki", "general");
      await saveConfig(wikiDir, config);
      const entry: RegistryEntry = {
        path: wikiDir,
        name: "defaultwiki",
        domain: "general",
        created: config.created,
      };
      await addToRegistry("defaultwiki", entry);

      // Resolve from a directory that is NOT the wiki
      const origCwd = process.cwd();
      process.chdir(testDir);
      try {
        const result = await resolveWiki({});
        expect(result).not.toBeNull();
        expect(result!.id).toBe("defaultwiki");
      } finally {
        process.chdir(origCwd);
      }
    } finally {
      await rm(wikiDir, { recursive: true, force: true });
    }
  });

  it("--wiki flag returns null for unknown id", async () => {
    const result = await resolveWiki({ wiki: "nonexistent" });
    expect(result).toBeNull();
  });
});

// --- templates ---

describe("templates", () => {
  it("getDefaultConfig returns valid WikiConfig", () => {
    const config = getDefaultConfig("test", "science");
    expect(config.name).toBe("test");
    expect(config.domain).toBe("science");
    expect(config.created).toBeTruthy();
    expect(config.paths.raw).toBe("raw");
    expect(config.paths.wiki).toBe("wiki");
    expect(config.paths.schema).toBe("SCHEMA.md");
  });

  it("getDefaultSchema includes wiki name and domain", () => {
    const schema = getDefaultSchema("mywiki", "science");
    expect(schema).toContain("mywiki");
    expect(schema).toContain("science");
    expect(schema).toContain("wiki init");
    expect(schema).toContain("wiki search");
  });

  it("getDefaultIndex has section headers", () => {
    const index = getDefaultIndex();
    expect(index).toContain("## Sources");
    expect(index).toContain("## Entities");
    expect(index).toContain("## Concepts");
    expect(index).toContain("## Synthesis");
  });

  it("getVizWorkflow returns valid YAML with required fields", () => {
    const workflow = getVizWorkflow();
    expect(workflow).toContain("GITHUB_REPOSITORY");
    const parsed = yaml.load(workflow) as any;
    expect(parsed.name).toBeTruthy();
    expect(parsed.on.push.branches).toContain("main");
    expect(parsed.on.push.branches).toContain("master");
    expect(parsed.jobs["build-and-deploy"]).toBeDefined();
    expect(parsed.permissions.pages).toBe("write");
  });

  it("getBuildGraphScript contains wikilink regex and graph.json output", () => {
    const script = getBuildGraphScript();
    expect(script).toContain("\\[\\[([^\\]|]+)");
    expect(script).toContain("graph.json");
    expect(script).toContain("findMdFiles");
    expect(script).toContain("stripFrontmatter");
    expect(script).toContain("body:");
  });

  it("getBuildSiteScript references d3 CDN and produces index.html", () => {
    const script = getBuildSiteScript();
    expect(script).toContain("cdn.jsdelivr.net/npm/d3@7");
    expect(script).toContain("cdn.jsdelivr.net/npm/marked@12");
    expect(script).toContain("cdn.jsdelivr.net/npm/dompurify@3");
    expect(script).toContain("index.html");
    expect(script).toContain("forceSimulation");
    expect(script).toContain("library-panel");
    expect(script).toContain("viz-doc");
    expect(script).toContain("md-viewer");
    expect(script).toContain("readerBody");
    expect(script).toContain("prefers-reduced-motion");
    expect(script).toContain("process.env.GITHUB_REPOSITORY");
    // Must embed JSON at build time (not a stray backslash before $, which breaks the browser)
    expect(script).toContain("${" + "JSON.stringify(graph)};");
    expect(script).not.toMatch(/const data = \\+\$\{JSON/);
  });

  it("getWikiGitignore includes node_modules and dist", () => {
    const gitignore = getWikiGitignore();
    expect(gitignore).toContain("node_modules/");
    expect(gitignore).toContain("dist/");
  });
});

// --- init integration ---

describe("init command (integration)", () => {
  it("creates all directories and files (filesystem)", async () => {
    const wikiDir = join(testDir, "mywiki");
    const proc = Bun.spawn(
      ["bun", "run", "src/index.ts", "init", wikiDir, "--name", "mywiki", "--domain", "test"],
      { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;

    // Check directories exist
    const wikoDirStat = await stat(join(wikiDir, "wiki"));
    expect(wikoDirStat.isDirectory()).toBe(true);
    const rawDirStat = await stat(join(wikiDir, "raw"));
    expect(rawDirStat.isDirectory()).toBe(true);
    const assetsDirStat = await stat(join(wikiDir, "raw/assets"));
    expect(assetsDirStat.isDirectory()).toBe(true);

    for (const sub of ["entities", "concepts", "sources", "synthesis"]) {
      const s = await stat(join(wikiDir, "wiki", sub));
      expect(s.isDirectory()).toBe(true);
    }

    // Check files exist
    expect(await Bun.file(join(wikiDir, ".llmwiki.yaml")).exists()).toBe(true);
    expect(await Bun.file(join(wikiDir, "SCHEMA.md")).exists()).toBe(true);
    expect(await Bun.file(join(wikiDir, "wiki/index.md")).exists()).toBe(true);

    // Init must not create a .git directory
    let hasGit = true;
    try { await stat(join(wikiDir, ".git")); } catch { hasGit = false; }
    expect(hasGit).toBe(false);
  });

  it("fails when wiki already exists", async () => {
    const wikiDir = join(testDir, "dupwiki");
    const env = { ...process.env, LLMWIKI_CONFIG_DIR: configDir };
    const proc1 = Bun.spawn(
      ["bun", "run", "src/index.ts", "init", wikiDir, "--name", "dupwiki"],
      { cwd: process.cwd(), stdout: "pipe", stderr: "pipe", env },
    );
    await proc1.exited;
    expect(proc1.exitCode).toBe(0);

    const proc2 = Bun.spawn(
      ["bun", "run", "src/index.ts", "init", wikiDir, "--name", "dupwiki2"],
      { cwd: process.cwd(), stdout: "pipe", stderr: "pipe", env },
    );
    await proc2.exited;
    expect(proc2.exitCode).toBe(1);
    const err = await new Response(proc2.stderr).text();
    expect(err).toContain("already exists");
  });

  it("registers wiki in global registry", async () => {
    const wikiDir = join(testDir, "regwiki");
    const proc = Bun.spawn(
      ["bun", "run", "src/index.ts", "init", wikiDir, "--name", "regwiki"],
      {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, LLMWIKI_CONFIG_DIR: configDir },
      },
    );
    await proc.exited;

    const registry = await loadRegistry();
    expect(registry.wikis["regwiki"]).toBeDefined();
    expect(registry.default).toBe("regwiki");
  });

  it("uses directory basename as default name", async () => {
    const wikiDir = join(testDir, "auto-named");
    const proc = Bun.spawn(
      ["bun", "run", "src/index.ts", "init", wikiDir],
      {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, LLMWIKI_CONFIG_DIR: configDir },
      },
    );
    await proc.exited;

    const config = await loadConfig(wikiDir);
    expect(config?.name).toBe("auto-named");
  });
});

describe("init does not scaffold viz or git", () => {
  it("creates only wiki layout without .github or scripts", async () => {
    const wikiDir = join(testDir, "plainwiki");
    const proc = Bun.spawn(
      ["bun", "run", "src/index.ts", "init", wikiDir, "--name", "plainwiki"],
      {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, LLMWIKI_CONFIG_DIR: configDir },
      },
    );
    await proc.exited;

    let hasGithub = true;
    try {
      await stat(join(wikiDir, ".github"));
    } catch {
      hasGithub = false;
    }
    expect(hasGithub).toBe(false);

    let hasScripts = true;
    try {
      await stat(join(wikiDir, "scripts"));
    } catch {
      hasScripts = false;
    }
    expect(hasScripts).toBe(false);

    let hasGit = true;
    try {
      await stat(join(wikiDir, ".git"));
    } catch {
      hasGit = false;
    }
    expect(hasGit).toBe(false);
  });
});
