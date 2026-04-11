import { Command } from "commander";
import { resolve, basename } from "path";
import { homedir } from "os";
import { listRepos, createRepo, getRepo } from "../lib/github.ts";
import { loadAuth } from "../lib/auth.ts";
import { promptUser } from "../lib/prompt.ts";
import { loadConfig } from "../lib/config.ts";
import { addToRegistry } from "../lib/registry.ts";
import * as git from "../lib/git.ts";
import { createProvider } from "../lib/storage.ts";
import type { WikiContext, RegistryEntry } from "../types.ts";

export function makeRepoCommand(): Command {
  const cmd = new Command("repo").description("Manage GitHub wiki repositories");

  cmd
    .command("list")
    .description("List your GitHub repositories")
    .option("-a, --all", "show all repos (default: 20 most recent)")
    .option("-f, --filter <text>", "filter repos by name")
    .action(async (options: { all?: boolean; filter?: string }) => {
      const auth = await loadAuth();
      if (!auth) {
        console.error('Not authenticated. Run "wiki auth login" first.');
        process.exit(1);
      }

      const repos = await listRepos({
        all: options.all,
        filter: options.filter,
      });

      if (repos.length === 0) {
        console.log("No repositories found.");
        return;
      }

      for (const repo of repos) {
        const vis = repo.private ? "private" : "public";
        console.log(`  ${repo.full_name} (${vis})`);
        if (repo.description) console.log(`    ${repo.description}`);
        console.log(`    ${repo.html_url}`);
        console.log();
      }
    });

  cmd
    .command("create")
    .description("Create a GitHub repo and initialize a wiki")
    .argument("<name>", "wiki name")
    .option("-d, --domain <domain>", "knowledge domain", "general")
    .option("--public", "create a public repo (default: private)")
    .option("--dir <path>", "local directory path")
    .action(
      async (
        name: string,
        options: { domain: string; public?: boolean; dir?: string },
      ) => {
        const auth = await loadAuth();
        if (!auth) {
          console.error('Not authenticated. Run "wiki auth login" first.');
          process.exit(1);
        }

        const repoName = `wiki-${name}`;
        console.log(`Creating GitHub repo: ${repoName}...`);

        let repo;
        try {
          repo = await createRepo(repoName, {
            private: !options.public,
            description: `LLM Wiki: ${name} (${options.domain})`,
          });
        } catch (err: any) {
          if (err.message?.includes("already exists")) {
            console.log(`Repo "${repoName}" already exists, connecting to it...`);
            repo = await getRepo(auth.username, repoName);
            if (!repo) {
              console.error(`Could not find repo "${repoName}" on your account.`);
              process.exit(1);
            }
          } else {
            console.error(err.message);
            process.exit(1);
          }
        }

        console.log(`Created: ${repo.html_url}`);

        // Initialize local wiki
        const localDir = resolve(
          options.dir ?? `${homedir()}/wikis/${name}`,
        );

        // Import and run init logic
        const { makeInitCommand } = await import("./init.ts");
        const initCmd = makeInitCommand();
        await initCmd.parseAsync([
          "node",
          "wiki",
          localDir,
          "--name",
          name,
          "--domain",
          options.domain,
        ]);

        // Add remote and push
        await git.addRemote(localDir, "origin", repo.ssh_url);
        const branch = await git.currentBranch(localDir);
        const pushResult = await git.push(localDir, "origin", branch);
        if (pushResult.ok) {
          console.log("Pushed to GitHub.");
        } else {
          console.error(`Warning: push failed: ${pushResult.output}`);
          console.log(`You can push manually: cd ${localDir} && git push -u origin ${branch}`);
        }
      },
    );

  cmd
    .command("clone")
    .description("Clone a GitHub repo and register it")
    .argument("[repo-name]", "repository name (e.g. wiki-personal)")
    .option("--dir <path>", "local directory path")
    .action(async (repoName: string | undefined, options: { dir?: string }) => {
      const auth = await loadAuth();
      if (!auth) {
        console.error('Not authenticated. Run "wiki auth login" first.');
        process.exit(1);
      }

      if (!repoName) {
        // List repos and let user pick
        const repos = await listRepos({ filter: "wiki-" });
        if (repos.length === 0) {
          console.log("No wiki repos found. Create one with: wiki repo create <name>");
          return;
        }

        console.log("\nWiki repositories:\n");
        repos.forEach((r, i) => {
          console.log(`  ${i + 1}) ${r.full_name}`);
        });
        console.log();

        const answer = await promptUser(`Select repo (1-${repos.length}): `);
        if (!answer) return;
        const idx = parseInt(answer, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= repos.length) {
          console.error("Invalid selection.");
          process.exit(1);
        }
        repoName = repos[idx]!.name;
      }

      const localDir = resolve(
        options.dir ?? `${homedir()}/wikis/${repoName.replace(/^wiki-/, "")}`,
      );

      console.log(`Cloning ${auth.username}/${repoName} to ${localDir}...`);
      const cloneResult = await git.clone(
        `git@github.com:${auth.username}/${repoName}.git`,
        localDir,
      );

      if (!cloneResult.ok) {
        console.error(`Clone failed: ${cloneResult.output}`);
        process.exit(1);
      }

      // Check if it's a wiki and register
      const config = await loadConfig(localDir);
      const wikiName = config?.name ?? repoName.replace(/^wiki-/, "");
      const domain = config?.domain ?? "general";

      const entry: RegistryEntry = {
        path: localDir,
        name: wikiName,
        domain,
        created: config?.created ?? new Date().toISOString(),
        remote: `git@github.com:${auth.username}/${repoName}.git`,
      };
      await addToRegistry(wikiName, entry);

      console.log(`Cloned and registered as "${wikiName}".`);
    });

  cmd
    .command("connect")
    .description("Connect an existing wiki to a GitHub repo")
    .argument("[wiki-id]", "wiki to connect")
    .action(async function (this: Command, wikiId: string | undefined) {
      const auth = await loadAuth();
      if (!auth) {
        console.error('Not authenticated. Run "wiki auth login" first.');
        process.exit(1);
      }

      let ctx: WikiContext;
      if (wikiId) {
        const { resolveWiki } = await import("../lib/resolver.ts");
        const resolved = await resolveWiki({ wiki: wikiId });
        if (!resolved) {
          console.error(`Wiki "${wikiId}" not found.`);
          process.exit(1);
        }
        ctx = { ...resolved, provider: await createProvider(resolved.config, resolved.root) };
      } else {
        ctx = this.optsWithGlobals().wikiContext;
      }

      const hasExisting = await git.hasRemote(ctx.root);
      if (hasExisting) {
        console.error("This wiki already has a remote. Use git remote to manage it.");
        process.exit(1);
      }

      const repoName = `wiki-${ctx.config.name}`;
      console.log(`Creating GitHub repo: ${repoName}...`);

      let repo;
      try {
        repo = await createRepo(repoName, {
          private: true,
          description: `LLM Wiki: ${ctx.config.name} (${ctx.config.domain})`,
        });
      } catch (err: any) {
        if (err.message?.includes("already exists")) {
          console.log(`Repo "${repoName}" already exists, connecting to it...`);
          repo = await getRepo(auth.username, repoName);
          if (!repo) {
            console.error(`Could not find repo "${repoName}" on your account.`);
            process.exit(1);
          }
        } else {
          console.error(err.message);
          process.exit(1);
        }
      }

      await git.addRemote(ctx.root, "origin", repo.ssh_url);
      const branch = await git.currentBranch(ctx.root);

      // Fetch and pull to merge any existing remote history
      await git.fetch(ctx.root, "origin");
      const pullResult = await git.pullRebaseAllowUnrelated(ctx.root, "origin", branch);
      if (!pullResult.ok || await git.hasConflicts(ctx.root)) {
        console.error("Remote added but there are merge conflicts.");
        console.log("Resolve conflicts in .llmwiki.yaml, then run:");
        console.log("  git add .llmwiki.yaml && git rebase --continue");
        console.log("  wiki push");
        process.exit(1);
      }

      const pushResult = await git.push(ctx.root, "origin", branch);
      if (pushResult.ok) {
        console.log(`Connected and pushed to ${repo.html_url}`);
      } else {
        console.error(`Remote added but push failed: ${pushResult.output}`);
        console.log(`Try: wiki sync`);
      }
    });

  return cmd;
}
