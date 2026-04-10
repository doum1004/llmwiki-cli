import { loadRegistry } from "./registry.ts";
import type { RegistryEntry } from "../types.ts";

export async function pickWiki(): Promise<
  (RegistryEntry & { id: string }) | null
> {
  const registry = await loadRegistry();
  const entries = Object.entries(registry.wikis);

  if (entries.length === 0) {
    console.error('No wikis registered. Run "wiki init" to create one.');
    return null;
  }

  console.log("\nRegistered wikis:\n");
  entries.forEach(([id, w], i) => {
    const marker = id === registry.default ? " (default)" : "";
    console.log(`  ${i + 1}) ${w.name} [${w.domain}]${marker}`);
    console.log(`     ${w.path}`);
  });
  console.log();

  const answer = prompt(`Select wiki (1-${entries.length}): `);
  if (!answer) return null;

  const index = parseInt(answer, 10) - 1;
  if (isNaN(index) || index < 0 || index >= entries.length) {
    console.error("Invalid selection.");
    return null;
  }

  const selected = entries[index];
  if (!selected) return null;
  return { id: selected[0], ...selected[1] };
}
