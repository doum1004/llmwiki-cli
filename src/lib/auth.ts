import * as yaml from "js-yaml";
import { join } from "path";
import { readFile, writeFile, mkdir, rm } from "fs/promises";
import { homedir } from "os";

export interface AuthConfig {
  token: string;
  username: string;
  created: string;
}

function getConfigDir(): string {
  return process.env.LLMWIKI_CONFIG_DIR ?? join(homedir(), ".config", "llmwiki");
}

function getAuthPath(): string {
  return join(getConfigDir(), "auth.yaml");
}

export async function loadAuth(): Promise<AuthConfig | null> {
  try {
    const content = await readFile(getAuthPath(), "utf-8");
    return yaml.load(content) as AuthConfig;
  } catch {
    return null;
  }
}

export async function saveAuth(auth: AuthConfig): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true });
  const content = yaml.dump(auth, { lineWidth: 120, sortKeys: false });
  await writeFile(getAuthPath(), content, "utf-8");
}

export async function clearAuth(): Promise<void> {
  try {
    await rm(getAuthPath());
  } catch {
    // ignore if doesn't exist
  }
}

export async function getToken(): Promise<string> {
  const auth = await loadAuth();
  if (!auth) {
    throw new Error('Not authenticated. Run "wiki auth login" first.');
  }
  return auth.token;
}

export async function isAuthenticated(): Promise<boolean> {
  const auth = await loadAuth();
  return auth !== null;
}

export async function validateToken(token: string): Promise<{ valid: boolean; username: string }> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return { valid: false, username: "" };
    const data = (await res.json()) as { login: string };
    return { valid: true, username: data.login };
  } catch {
    return { valid: false, username: "" };
  }
}
