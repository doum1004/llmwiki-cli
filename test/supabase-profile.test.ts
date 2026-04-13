import { describe, it, expect } from "bun:test";
import {
  validateProfileSlug,
  compositeSupabaseWikiId,
  resolveStorageProfile,
} from "../src/lib/supabase-profile.ts";

describe("validateProfileSlug", () => {
  it("accepts valid slugs", () => {
    expect(validateProfileSlug("dad")).toBe("dad");
    expect(validateProfileSlug("  mom_1  ")).toBe("mom_1");
  });

  it("rejects empty and invalid characters", () => {
    expect(() => validateProfileSlug("")).toThrow(/Invalid storage profile/);
    expect(() => validateProfileSlug("a:b")).toThrow(/Invalid storage profile/);
    expect(() => validateProfileSlug("son@home")).toThrow(/Invalid storage profile/);
  });
});

describe("compositeSupabaseWikiId", () => {
  it("joins name and profile with colon", () => {
    expect(compositeSupabaseWikiId("family", "dad")).toBe("family:dad");
  });
});

describe("resolveStorageProfile", () => {
  it("follows env > cli > registry > config", () => {
    expect(
      resolveStorageProfile({
        envValue: "envp",
        cliValue: "clip",
        registryValue: "regp",
        configValue: "cfgp",
      }),
    ).toEqual({ profile: "envp", source: "env" });

    expect(
      resolveStorageProfile({
        cliValue: "clip",
        registryValue: "regp",
        configValue: "cfgp",
      }),
    ).toEqual({ profile: "clip", source: "cli" });

    expect(
      resolveStorageProfile({
        registryValue: "regp",
        configValue: "cfgp",
      }),
    ).toEqual({ profile: "regp", source: "registry" });

    expect(resolveStorageProfile({ configValue: "cfgp" })).toEqual({
      profile: "cfgp",
      source: "config",
    });

    expect(resolveStorageProfile({})).toEqual({
      profile: undefined,
      source: "default",
    });
  });
});
