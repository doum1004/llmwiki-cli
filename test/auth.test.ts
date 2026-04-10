import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadAuth,
  saveAuth,
  clearAuth,
  isAuthenticated,
} from "../src/lib/auth.ts";

let configDir: string;
const origConfigDir = process.env.LLMWIKI_CONFIG_DIR;

beforeEach(async () => {
  configDir = await mkdtemp(join(tmpdir(), "llmwiki-auth-"));
  process.env.LLMWIKI_CONFIG_DIR = configDir;
});

afterEach(async () => {
  await rm(configDir, { recursive: true, force: true });
  if (origConfigDir) {
    process.env.LLMWIKI_CONFIG_DIR = origConfigDir;
  } else {
    delete process.env.LLMWIKI_CONFIG_DIR;
  }
});

describe("auth", () => {
  it("loadAuth returns null when not authenticated", async () => {
    const auth = await loadAuth();
    expect(auth).toBeNull();
  });

  it("isAuthenticated returns false when not authenticated", async () => {
    expect(await isAuthenticated()).toBe(false);
  });

  it("saveAuth and loadAuth roundtrip", async () => {
    const authData = {
      token: "ghp_test123",
      username: "testuser",
      created: "2026-01-01T00:00:00.000Z",
    };
    await saveAuth(authData);
    const loaded = await loadAuth();
    expect(loaded).toEqual(authData);
  });

  it("isAuthenticated returns true after saveAuth", async () => {
    await saveAuth({
      token: "ghp_test",
      username: "user",
      created: new Date().toISOString(),
    });
    expect(await isAuthenticated()).toBe(true);
  });

  it("clearAuth removes credentials", async () => {
    await saveAuth({
      token: "ghp_test",
      username: "user",
      created: new Date().toISOString(),
    });
    await clearAuth();
    expect(await isAuthenticated()).toBe(false);
  });

  it("clearAuth on empty config does not throw", async () => {
    await clearAuth(); // should not throw
    expect(await isAuthenticated()).toBe(false);
  });
});
