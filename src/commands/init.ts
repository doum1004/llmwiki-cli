import { Command } from "commander";
import { resolve, basename } from "path";
import { mkdir, writeFile, stat } from "fs/promises";
import { loadConfig, saveConfig } from "../lib/config.ts";
import { addToRegistry } from "../lib/registry.ts";
import { createProvider } from "../lib/storage.ts";
import { probeWikiPagesTable } from "../lib/supabase-wiki-pages-probe.ts";
import * as git from "../lib/git.ts";
import { createRepo, getUsername, enablePages } from "../lib/github.ts";
import { resolvedGitToken } from "../lib/git-credentials.ts";
import {
  getDefaultConfig,
  getDefaultSchema,
  getDefaultIndex,
  getDefaultLog,
  getVizWorkflow,
  getBuildGraphScript,
  getBuildSiteScript,
  getWikiGitignore,
} from "../lib/templates.ts";
import type { BackendType, RegistryEntry } from "../types.ts";

const SUPABASE_SQL_RAW = `
-- wiki_pages: optional user_id (NULL = single-tenant / service key); multi-user rows set user_id.
-- One row per (user_id, wiki_id, path); NULL user_id counts as one scope (PostgreSQL 15+).
create table if not exists public.wiki_pages (
  user_id uuid references auth.users (id) on delete cascade,
  wiki_id text not null,
  path text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  constraint wiki_pages_scope_unique unique nulls not distinct (user_id, wiki_id, path)
);

create or replace function public.wiki_pages_set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(new.user_id, auth.uid());
  elsif tg_op = 'UPDATE' then
    if old.user_id is not null then
      new.user_id := old.user_id;
    else
      new.user_id := coalesce(new.user_id, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists wiki_pages_set_user_id on public.wiki_pages;
create trigger wiki_pages_set_user_id
  before insert or update on public.wiki_pages
  for each row
  execute function public.wiki_pages_set_user_id();

alter table public.wiki_pages enable row level security;

drop policy if exists wiki_pages_authenticated_select on public.wiki_pages;
create policy wiki_pages_authenticated_select on public.wiki_pages
  for select to authenticated
  using (user_id is null or auth.uid() = user_id);

drop policy if exists wiki_pages_authenticated_insert on public.wiki_pages;
create policy wiki_pages_authenticated_insert on public.wiki_pages
  for insert to authenticated
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists wiki_pages_authenticated_update on public.wiki_pages;
create policy wiki_pages_authenticated_update on public.wiki_pages
  for update to authenticated
  using (user_id is null or auth.uid() = user_id)
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists wiki_pages_authenticated_delete on public.wiki_pages;
create policy wiki_pages_authenticated_delete on public.wiki_pages
  for delete to authenticated
  using (user_id is null or auth.uid() = user_id);

revoke all on public.wiki_pages from public;
revoke all on public.wiki_pages from anon;
grant select, insert, update, delete on public.wiki_pages to authenticated;
`.trim();

const SUPABASE_SQL = `-- Run this in your Supabase SQL Editor (new projects). Requires PostgreSQL 15+ (unique nulls not distinct). Older wiki_pages layouts need a manual migration or drop/recreate.
${SUPABASE_SQL_RAW}`;

export function makeInitCommand(): Command {
  return new Command("init")
    .description("Initialize a new wiki")
    .argument("[dir]", "directory to initialize (defaults to cwd)")
    .option("-n, --name <name>", "wiki name")
    .option("-d, --domain <domain>", "knowledge domain", "general")
    .option("-b, --backend <type>", "storage backend (filesystem, git, supabase)", "filesystem")
    .option("--git-token <token>", "GitHub personal access token")
    .option("--git-repo <owner/repo>", "GitHub repo (auto-created if omitted with --git-token)")
    .option("--supabase-url <url>", "Supabase project URL")
    .option("--supabase-key <key>", "Supabase anon/service key")
    .option("--viz", "scaffold GitHub Pages visualization (git backend only)", true)
    .option("--no-viz", "skip visualization scaffolding")
    .action(
      async (
        dir: string | undefined,
        options: {
          name?: string;
          domain: string;
          backend: string;
          gitToken?: string;
          gitRepo?: string;
          supabaseUrl?: string;
          supabaseKey?: string;
          viz: boolean;
        },
      ) => {
        const targetDir = resolve(dir ?? ".");
        const name = options.name ?? basename(targetDir);

        // Check for existing wiki — if found, only scaffold viz files
        const existingConfig = await loadConfig(targetDir);
        if (existingConfig) {
          if (!options.viz) {
            console.error("Wiki already exists at this directory. Use --viz to add visualization files.");
            process.exit(1);
          }
          if (existingConfig.backend !== "git") {
            console.error("Visualization requires git backend.");
            process.exit(1);
          }

          // Scaffold viz files into existing wiki
          await Promise.all([
            mkdir(resolve(targetDir, ".github/workflows"), { recursive: true }),
            mkdir(resolve(targetDir, "scripts"), { recursive: true }),
          ]);
          await Promise.all([
            writeFile(
              resolve(targetDir, ".github/workflows/wiki-viz.yml"),
              getVizWorkflow(),
              "utf-8",
            ),
            writeFile(
              resolve(targetDir, "scripts/build-graph.js"),
              getBuildGraphScript(),
              "utf-8",
            ),
            writeFile(
              resolve(targetDir, "scripts/build-site.js"),
              getBuildSiteScript(),
              "utf-8",
            ),
          ]);
          // Write .gitignore only if it doesn't exist
          const gitignorePath = resolve(targetDir, ".gitignore");
          try {
            await stat(gitignorePath);
          } catch {
            await writeFile(gitignorePath, getWikiGitignore(), "utf-8");
          }

          // Commit the viz files
          await git.addAll(targetDir);
          const vizCommit = await git.commit(targetDir, "Add wiki visualization");
          if (vizCommit.ok) {
            const rename = await git.renameCurrentBranchToMain(targetDir);
            if (!rename.ok) {
              console.error(
                `Warning: could not rename branch to main: ${rename.output}`,
              );
            }
          }

          // Push if remote is configured
          if (existingConfig.git) {
            const branch = await git.currentBranch(targetDir);
            const pushResult = await git.push(targetDir, "origin", branch);
            if (pushResult.ok) {
              console.log(`Pushed to ${existingConfig.git.repo}`);
              try {
                const pagesToken = resolvedGitToken(existingConfig);
                if (pagesToken) {
                  await enablePages(pagesToken, existingConfig.git.repo);
                }
              } catch {
                // Non-fatal
              }
            } else {
              console.error(`Warning: push failed: ${pushResult.output}`);
            }
          }

          console.log("Visualization: GitHub Actions workflow scaffolded.");
          console.log("Enable GitHub Pages (Settings → Pages → Source: GitHub Actions) to see the graph.");
          return;
        }

        const backend = options.backend as BackendType;
        const domain = options.domain;

        // Validate supabase options
        if (backend === "supabase") {
          if (!options.supabaseUrl || !options.supabaseKey) {
            console.error(
              "Supabase backend requires --supabase-url and --supabase-key.",
            );
            process.exit(1);
          }
        }

        // Resolve git config
        let gitConfig: { token: string; repo: string } | undefined;
        if (backend === "git" && options.gitToken) {
          let repo = options.gitRepo;
          if (!repo) {
            // Auto-create repo on GitHub
            const repoName = `wiki-${name}`;
            console.log(`Creating GitHub repo: ${repoName}...`);
            try {
              const created = await createRepo(options.gitToken, repoName);
              const username = await getUsername(options.gitToken);
              repo = `${username}/${created.name}`;
              console.log(`Created: ${repo}`);
            } catch (err: any) {
              console.error(`Failed to create repo: ${err.message}`);
              process.exit(1);
            }
          }
          gitConfig = { token: options.gitToken, repo };
        }

        const supabaseConfig =
          backend === "supabase"
            ? { url: options.supabaseUrl!, key: options.supabaseKey! }
            : undefined;

        // Create local directory for config
        await mkdir(targetDir, { recursive: true });

        // Write config
        const config = getDefaultConfig(name, domain, backend, {
          git: gitConfig ? { repo: gitConfig.repo } : undefined,
          supabase: supabaseConfig,
        });
        await saveConfig(targetDir, config);

        if (backend === "supabase") {
          const accessToken =
            process.env.LLMWIKI_SUPABASE_ACCESS_TOKEN?.trim() ||
            config.supabase?.access_token?.trim() ||
            undefined;

          const probe = await probeWikiPagesTable(
            options.supabaseUrl!,
            options.supabaseKey!,
            { accessToken },
          );

          if (!probe.ok) {
            console.log(`\n${SUPABASE_SQL}\n`);
            console.error(`wiki_pages is missing or incompatible: ${probe.message}`);
            console.error(
              "Run the SQL above in the Supabase SQL Editor, then re-run wiki init. PostgreSQL 15+ is required (unique nulls not distinct).",
            );
          } else {
            const provider = await createProvider(config, targetDir, {
              supabaseAccessToken: accessToken,
            });
            try {
              await provider.writePage("SCHEMA.md", getDefaultSchema(name, domain));
              await provider.writePage("wiki/index.md", getDefaultIndex());
              await provider.writePage("wiki/log.md", getDefaultLog());
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              const looksLikeSchema =
                /column .* does not exist|relation "wiki_pages" does not exist|constraint|unique|null value in column|violates not-null|there is no unique or exclusion constraint matching/i.test(
                  msg,
                );
              if (looksLikeSchema) {
                console.log(`\n${SUPABASE_SQL}\n`);
              }
              console.error(`Initial Supabase writes failed: ${msg}`);
              console.error(
                "If this is RLS or permissions, use the anon project key plus LLMWIKI_SUPABASE_ACCESS_TOKEN (Supabase user JWT). If SQL was printed above, apply it in the Supabase SQL Editor and re-run init.",
              );
            }
          }
        } else {
          // Filesystem/git: create local directory structure + files
          const dirs = [
            resolve(targetDir, "raw"),
            resolve(targetDir, "raw/assets"),
            resolve(targetDir, "wiki"),
            resolve(targetDir, "wiki/entities"),
            resolve(targetDir, "wiki/concepts"),
            resolve(targetDir, "wiki/sources"),
            resolve(targetDir, "wiki/synthesis"),
          ];
          await Promise.all(dirs.map((d) => mkdir(d, { recursive: true })));

          await Promise.all([
            writeFile(
              resolve(targetDir, "SCHEMA.md"),
              getDefaultSchema(name, domain),
              "utf-8",
            ),
            writeFile(
              resolve(targetDir, "wiki/index.md"),
              getDefaultIndex(),
              "utf-8",
            ),
            writeFile(
              resolve(targetDir, "wiki/log.md"),
              getDefaultLog(),
              "utf-8",
            ),
          ]);

          // Scaffold visualization files (git backend only)
          if (backend === "git" && options.viz) {
            await Promise.all([
              mkdir(resolve(targetDir, ".github/workflows"), { recursive: true }),
              mkdir(resolve(targetDir, "scripts"), { recursive: true }),
            ]);
            await Promise.all([
              writeFile(
                resolve(targetDir, ".github/workflows/wiki-viz.yml"),
                getVizWorkflow(),
                "utf-8",
              ),
              writeFile(
                resolve(targetDir, "scripts/build-graph.js"),
                getBuildGraphScript(),
                "utf-8",
              ),
              writeFile(
                resolve(targetDir, "scripts/build-site.js"),
                getBuildSiteScript(),
                "utf-8",
              ),
              writeFile(
                resolve(targetDir, ".gitignore"),
                getWikiGitignore(),
                "utf-8",
              ),
            ]);
          }

          // Git init + initial commit + remote (git backend only)
          if (backend === "git") {
            const initResult = await git.init(targetDir);
            if (!initResult.ok) {
              console.error(
                `Warning: git init failed: ${initResult.output}`,
              );
            } else {
              await git.addAll(targetDir);
              const commitResult = await git.commit(
                targetDir,
                "Initialize wiki",
              );
              if (!commitResult.ok) {
                console.error(
                  `Warning: initial commit failed: ${commitResult.output}`,
                );
              } else {
                const rename = await git.renameCurrentBranchToMain(targetDir);
                if (!rename.ok) {
                  console.error(
                    `Warning: could not rename branch to main: ${rename.output}`,
                  );
                }
              }

              // Add remote and push if git config provided
              if (gitConfig) {
                const remoteUrl = `https://${gitConfig.token}@github.com/${gitConfig.repo}.git`;
                await git.addRemote(targetDir, "origin", remoteUrl);
                const branch = await git.currentBranch(targetDir);
                const pushResult = await git.push(targetDir, "origin", branch);
                if (pushResult.ok) {
                  console.log(`Pushed to ${gitConfig.repo}`);
                } else {
                  console.error(
                    `Warning: initial push failed: ${pushResult.output}`,
                  );
                }

                // Enable GitHub Pages if viz is enabled
                if (options.viz) {
                  try {
                    await enablePages(gitConfig.token, gitConfig.repo);
                  } catch {
                    // Non-fatal — user can enable manually
                  }
                }
              }
            }
          }
        }

        // Register in global registry
        const entry: RegistryEntry = {
          path: targetDir,
          name,
          domain,
          created: config.created,
        };
        await addToRegistry(name, entry);

        console.log(`Wiki "${name}" initialized at ${targetDir}`);
        console.log(`Domain: ${domain}`);
        console.log(`Backend: ${backend}`);
        if (backend === "git" && options.viz) {
          console.log("Visualization: GitHub Actions workflow scaffolded.");
          console.log("Enable GitHub Pages (Settings → Pages → Source: GitHub Actions) to see the graph.");
        }
        console.log("Registered in global registry.");
        if (backend === "git" && gitConfig) {
          console.log(
            "Git: PAT is not stored in .llmwiki.yaml (avoids GitHub push secret scanning). Use LLMWIKI_GIT_TOKEN, GITHUB_TOKEN, or GIT_TOKEN in your environment for wiki write/push.",
          );
        }
      },
    );
}
