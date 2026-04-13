import { getBuildGraphScript, getBuildSiteScript } from "../src/lib/templates.ts";
import { writeFileSync, mkdirSync } from "fs";

const outDir = process.argv[2] || ".viz-tmp";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/build-graph.cjs`, getBuildGraphScript());
writeFileSync(`${outDir}/build-site.cjs`, getBuildSiteScript());
console.log(`Wrote build-graph.cjs and build-site.cjs to ${outDir}`);
