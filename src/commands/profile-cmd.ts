import { Command } from "commander";
import { loadRegistry, getStorageProfile, setStorageProfile } from "../lib/registry.ts";
import type { WikiContext } from "../types.ts";

export function makeProfileCommand(): Command {
  const cmd = new Command("profile")
    .description(
      "Storage profile: filesystem/git use profiles/<slug>/; Supabase uses composite wiki_id (not access control)",
    );

  cmd
    .command("show")
    .description("Print registry wiki id, effective storage location, and profile source")
    .action(async function (this: Command) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const s = ctx.storageScope;
      console.log(`Registry wiki id: ${ctx.id}`);
      console.log(`Effective storage root: ${s.effectiveRoot}`);
      console.log(`Profile segment: ${s.profile ?? "(none — default storage)"}`);
      console.log(`Source: ${s.source}`);
      if (ctx.config.backend === "supabase" && s.supabaseWikiId !== undefined) {
        console.log(`Supabase wiki_id: ${s.supabaseWikiId}`);
      }
      const registry = await loadRegistry();
      const saved = getStorageProfile(registry, ctx.id);
      if (saved) {
        console.log(`Saved profile in registry: ${saved}`);
      }
    });

  cmd
    .command("use")
    .description("Set active storage profile for this wiki (stored in global registry)")
    .argument("<profile>", "slug, e.g. dad, mom, son")
    .action(async function (this: Command, profile: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const ok = await setStorageProfile(ctx.id, profile);
      if (!ok) {
        console.error(
          `Wiki "${ctx.id}" is not in the registry. Add it with wiki init or point --wiki at a registered id.`,
        );
        process.exit(1);
      }
      const registry = await loadRegistry();
      const saved = getStorageProfile(registry, ctx.id);
      console.log(`Storage profile for "${ctx.id}" set to "${saved}".`);
    });

  cmd
    .command("clear")
    .description("Remove saved storage profile for this wiki from the registry")
    .action(async function (this: Command) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const ok = await setStorageProfile(ctx.id, null);
      if (!ok) {
        console.error(
          `Wiki "${ctx.id}" is not in the registry. Add it with wiki init or point --wiki at a registered id.`,
        );
        process.exit(1);
      }
      console.log(`Storage profile cleared for "${ctx.id}".`);
    });

  return cmd;
}
