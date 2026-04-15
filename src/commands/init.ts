import { Command } from "commander";
import { resolve, basename } from "path";
import { mkdir, writeFile, stat } from "fs/promises";
import { loadConfig, saveConfig } from "../lib/config.ts";
import { addToRegistry } from "../lib/registry.ts";
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

export function makeInitCommand(): Command {
  return new Command("init")
    .description("Initialize a new wiki")
    .argument("[dir]", "directory to initialize (defaults to cwd)")
    .option("-n, --name <name>", "wiki name")
    .option("-d, --domain <domain>", "knowledge domain", "general")
    .option("-b, --backend <type>", "storage backend (filesystem, git)", "filesystem")
    .option("--git-token <token>", "GitHub personal access token")
    .option("--git-repo <owner/repo>", "GitHub repo (auto-created if omitted with --git-token)")
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

        // Create local directory for config
        await mkdir(targetDir, { recursive: true });

        // Write config
        const config = getDefaultConfig(name, domain, backend, {
          git: gitConfig ? { repo: gitConfig.repo } : undefined,
        });
        await saveConfig(targetDir, config);

        {
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
